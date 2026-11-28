// Shared by the Vercel function (api/describe.js) and the browser fallback (src/lib/gemini.js).
// Uses only fetch + AbortController so it runs in both places.

const API = "https://generativelanguage.googleapis.com/v1beta";
const STATIC_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
];

export const TONES = {
  technical: "Technical and precise. Mention the language/framework and what the code does.",
  concise: "As short as possible. One clear sentence per language, no filler.",
  friendly: "Warm and simple, aimed at beginners who want to try the code quickly.",
};

export function buildPrompt({ rawNotes, tags, title, tone = "technical" }) {
  return `You write short descriptions for a developer's source-code archive (@codewhiz.1).
Turn the rough notes below into a clean description in BOTH Arabic and English.

Rough notes:
---
${String(rawNotes).trim().slice(0, 2000)}
---
Project title (context only): ${title || "-"}
Technologies (context only): ${tags || "General"}
Tone: ${TONES[tone] || TONES.technical}

Rules:
- Base the text on the rough notes, not on the title.
- At most 2 sentences per language. Say what the code does and what the person gets in the ZIP.
- No hype, no emojis. The Arabic must be natural Modern Standard Arabic, not a literal translation.
- Also suggest one short project title (max 5 words, in English) and up to 5 technology tags.
- Reply with JSON only, exactly this shape:
{"ar":"...","en":"...","title":"...","tags":["..."]}`;
}

function fail(code, extra = {}) {
  const err = new Error(code);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

async function gfetch(url, init, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    throw fail(e?.name === "AbortError" ? "request-timeout" : "gemini-network");
  } finally {
    clearTimeout(timer);
  }
}

function versionOf(name) {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

async function discoverModels(apiKey) {
  try {
    const res = await gfetch(`${API}/models?pageSize=100&key=${encodeURIComponent(apiKey)}`, {}, 6000);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /^gemini-[\d.]+-flash(-lite)?$|^gemini-flash-latest$/.test(n))
      .sort((a, b) => versionOf(b) - versionOf(a) || a.length - b.length)
      .slice(0, 4);
  } catch {
    return [];
  }
}

function parseJson(raw) {
  const cleaned = String(raw).replace(/```json|```/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
}

async function callModel(apiKey, model, prompt, thinkingOff) {
  const generationConfig = {
    temperature: 0.4,
    maxOutputTokens: 1024,
    responseMimeType: "application/json",
  };
  if (thinkingOff && /gemini-2\.5-flash/.test(model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const res = await gfetch(
    `${API}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig }),
    },
    25000
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const googleMessage = body?.error?.message || "";
    throw fail(`gemini-${res.status}`, { status: res.status, googleMessage, model });
  }

  const data = await res.json();
  if (data?.promptFeedback?.blockReason) throw fail("gemini-blocked", { model });
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
  if (!text.trim()) throw fail("gemini-bad-response", { model });

  let parsed;
  try {
    parsed = parseJson(text);
  } catch {
    throw fail("gemini-bad-response", { model });
  }
  const ar = String(parsed.ar || "").trim();
  const en = String(parsed.en || "").trim();
  if (!ar || !en) throw fail("gemini-bad-response", { model });

  return {
    ar,
    en,
    title: String(parsed.title || "").trim(),
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 5)
      : [],
    model,
  };
}

// Errors that mean "this key/region/request can never work" - no point trying other models.
const FATAL = /api key not valid|api_key_invalid|location is not supported|has not been used in project|is disabled|service_blocked/i;

export async function runGemini({ apiKey, prompt }) {
  const discovered = await discoverModels(apiKey);
  const models = [...new Set([...discovered, ...STATIC_MODELS])];
  let lastError = null;

  for (const model of models) {
    for (const thinkingOff of [true, false]) {
      try {
        return await callModel(apiKey, model, prompt, thinkingOff);
      } catch (err) {
        lastError = err;
        const msg = String(err.googleMessage || "");
        if (err.status === 400 && /thinking/i.test(msg) && thinkingOff) continue; // retry same model without thinkingConfig
        if (err.status === 403 || FATAL.test(msg) || (err.status === 400 && !/thinking/i.test(msg) && /api key|location/i.test(msg))) {
          throw err;
        }
        break; // 404 / 429 / 5xx / timeout / bad output -> next model
      }
    }
  }
  throw lastError || fail("gemini-unavailable");
}
