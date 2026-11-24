import { withTimeout } from "./diagnostics";

const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
];

function extractJsonObject(rawText) {
  const cleaned = rawText.replace(/```json|```/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
}

export async function generateBilingualDescription({ rawNotes, tags }) {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!apiKey) {
    const err = new Error("gemini-missing-key");
    err.code = "gemini-missing-key";
    throw err;
  }

  if (!rawNotes || !rawNotes.trim()) {
    const err = new Error("gemini-empty-notes");
    err.code = "gemini-empty-notes";
    throw err;
  }

  const prompt = `
You are a technical copywriter for a developer portfolio (@codewhiz.1).
Rewrite and polish the following rough project description into a clean, clear, developer-oriented summary in BOTH Arabic and English.

Rough Description:
---
${rawNotes.trim()}
---

Technologies / Tags (for context only): ${tags || "General"}

Strict Rules:
- Base your description strictly on the rough description provided above, NOT on any project title.
- Keep each language version natural, concise, and practical (2 sentences max).
- Explain what the code does and what the user gets when downloading the ZIP archive.
- Avoid marketing hype, clichés, or emojis.
- Return valid JSON ONLY with exact keys "ar" and "en":
{"ar": "...", "en": "..."}
`;

  let lastError = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const response = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.5,
              },
            }),
          }
        ),
        16000
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const googleMessage = errBody?.error?.message || "";
        const err = new Error(`gemini-${response.status}: ${googleMessage}`);
        err.code = `gemini-${response.status}`;
        err.status = response.status;
        err.googleMessage = googleMessage;
        lastError = err;

        if (response.status === 404 || response.status === 503) {
          continue;
        }
        throw err;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = extractJsonObject(text);

      return {
        ar: (parsed.ar || "").trim(),
        en: (parsed.en || "").trim(),
      };
    } catch (err) {
      lastError = err;
      if (err?.status === 404 || err?.status === 503) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("gemini-unavailable");
}
