const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];

function extractJsonObject(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Empty response from Gemini");
  }
  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  try {
    return JSON.parse(candidate);
  } catch {
    // Attempt light repair for unescaped newlines inside JSON string values
    const repaired = candidate.replace(/\r?\n/g, " ").replace(/,\s*}/g, "}");
    return JSON.parse(repaired);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "method-not-allowed", message: "Use POST" } });
  }

  const { rawNotes = "", tags = "", title = "", tone = "technical", apiKey: clientKey = "" } =
    req.body || {};

  const apiKey = String(
    process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || clientKey || ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!apiKey) {
    return res.status(400).json({
      error: {
        code: "gemini-missing-key",
        message: "GEMINI_API_KEY / VITE_GEMINI_API_KEY is not configured.",
      },
    });
  }

  if (!String(rawNotes).trim()) {
    return res.status(400).json({
      error: {
        code: "gemini-empty-notes",
        message: "Rough description notes are required.",
      },
    });
  }

  const styleGuide =
    tone === "concise"
      ? "Keep each language ultra-concise (1 crisp sentence, under 22 words)."
      : "Keep each language natural, clear, and practical (2 concise sentences max).";

  const prompt = `You are a senior technical editor for a developer code archive (@codewhiz.1).
Rewrite and polish the rough project notes below into clean, developer-focused descriptions in BOTH Arabic ("ar") and English ("en").

Project Title (optional context): ${String(title).trim() || "Untitled"}
Technologies / Tags: ${String(tags).trim() || "General"}
Rough Notes:
---
${String(rawNotes).trim()}
---

Rules:
- Base the copy strictly on the rough notes provided above.
- ${styleGuide}
- Clearly state what the code does and what the developer gets inside the ZIP archive.
- Use human, editorial technical writing: zero marketing hype, zero clichés, zero emojis.
- Return ONLY a valid JSON object with exact keys "ar" and "en":
{"ar": "...", "en": "..."}`;

  let lastError = null;

  for (const model of FALLBACK_MODELS) {
    for (const useJsonMime of [true, false]) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 22000);

      try {
        const generationConfig = { temperature: 0.45 };
        if (useJsonMime) {
          generationConfig.responseMimeType = "application/json";
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
            apiKey
          )}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig,
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timer);

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const googleMessage = errBody?.error?.message || response.statusText || "";
          lastError = {
            status: response.status,
            code: `gemini-${response.status}`,
            message: googleMessage,
          };

          // If responseMimeType caused a 400 error, retry same model without it
          if (response.status === 400 && useJsonMime) {
            continue;
          }
          // Try next model on 404, 429, 500, 503
          if ([404, 429, 500, 503].includes(response.status)) {
            break;
          }
          // Fatal auth/key/region error
          return res.status(response.status).json({ error: lastError });
        }

        const data = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("") || "";

        const parsed = extractJsonObject(text);
        const ar = String(parsed?.ar || "").trim();
        const en = String(parsed?.en || "").trim();

        if (!ar && !en) {
          lastError = {
            status: 502,
            code: "gemini-empty-output",
            message: "Model returned empty fields.",
          };
          continue;
        }

        return res.status(200).json({ ar, en, model });
      } catch (err) {
        clearTimeout(timer);
        lastError = {
          status: 504,
          code: err?.name === "AbortError" ? "request-timeout" : "gemini-network",
          message: err?.message || "Network error calling Gemini.",
        };
        break;
      }
    }
  }

  return res.status(lastError?.status || 503).json({
    error: lastError || {
      code: "gemini-unavailable",
      message: "All Gemini models failed to respond.",
    },
  });
}
