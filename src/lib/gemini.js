import { withTimeout } from "./diagnostics";

const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];

function getCleanApiKey() {
  return (import.meta.env.VITE_GEMINI_API_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function extractJsonObject(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("استجابة فارغة من نموذج الذكاء الاصطناعي");
  }
  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate =
    start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  try {
    return JSON.parse(candidate);
  } catch {
    const repaired = candidate.replace(/\r?\n/g, " ").replace(/,\s*}/g, "}");
    return JSON.parse(repaired);
  }
}

function createGeminiError(code, status, googleMessage) {
  const err = new Error(googleMessage || code);
  err.code = code;
  err.status = status;
  err.googleMessage = googleMessage || "";
  return err;
}

/**
 * Primary route: calls Vercel Serverless proxy `/api/generate-description`
 * (bypasses regional geo-blocks and keeps keys cleaner).
 * Falls back to direct client-side Gemini REST API during local `npm run dev`.
 */
export async function generateBilingualDescription({
  rawNotes,
  tags = "",
  title = "",
  tone = "technical",
}) {
  if (!rawNotes || !rawNotes.trim()) {
    throw createGeminiError("gemini-empty-notes", 400, "");
  }

  const apiKey = getCleanApiKey();

  // 1) Try Vercel Serverless Proxy first (works in production & vercel dev)
  try {
    const proxyRes = await withTimeout(
      fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawNotes: rawNotes.trim(),
          tags,
          title,
          tone,
          apiKey,
        }),
      }),
      26000
    );

    const contentType = proxyRes.headers.get("content-type") || "";
    if (proxyRes.ok && contentType.includes("application/json")) {
      const data = await proxyRes.json();
      if (data?.ar || data?.en) {
        return {
          ar: String(data.ar || "").trim(),
          en: String(data.en || "").trim(),
          model: data.model || "gemini-proxy",
          via: "server",
        };
      }
    } else if (proxyRes.status !== 404 && proxyRes.status !== 405 && contentType.includes("application/json")) {
      const errJson = await proxyRes.json().catch(() => ({}));
      const errObj = errJson?.error;
      if (errObj?.code && errObj.code !== "gemini-missing-key") {
        throw createGeminiError(
          errObj.code,
          errObj.status || proxyRes.status,
          errObj.message || ""
        );
      }
    }
  } catch (proxyErr) {
    // If the proxy explicitly returned a Gemini API error (like invalid key/quota), rethrow it
    if (proxyErr?.code && String(proxyErr.code).startsWith("gemini-")) {
      throw proxyErr;
    }
    // Otherwise (e.g. local Vite dev server without /api), continue to direct client call
  }

  // 2) Direct client-side fallback (useful on local Vite dev server)
  if (!apiKey) {
    throw createGeminiError("gemini-missing-key", 400, "");
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
${rawNotes.trim()}
---

Rules:
- Base your description strictly on the rough notes provided above.
- ${styleGuide}
- Clearly explain what the code does and what the developer gets inside the ZIP archive.
- Avoid marketing hype, clichés, or emojis.
- Return valid JSON ONLY with exact keys "ar" and "en":
{"ar": "...", "en": "..."}`;

  let lastError = null;

  for (const model of FALLBACK_MODELS) {
    for (const useJsonMime of [true, false]) {
      try {
        const generationConfig = { temperature: 0.45 };
        if (useJsonMime) {
          generationConfig.responseMimeType = "application/json";
        }

        const response = await withTimeout(
          fetch(
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
            }
          ),
          25000
        );

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const googleMessage = errBody?.error?.message || "";
          const err = createGeminiError(
            `gemini-${response.status}`,
            response.status,
            googleMessage
          );
          lastError = err;

          if (response.status === 400 && useJsonMime) {
            continue;
          }
          if ([404, 429, 500, 503].includes(response.status)) {
            break;
          }
          throw err;
        }

        const data = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("") || "{}";
        const parsed = extractJsonObject(text);

        const ar = String(parsed?.ar || "").trim();
        const en = String(parsed?.en || "").trim();

        if (!ar && !en) {
          lastError = createGeminiError("gemini-empty-output", 502, "Empty output");
          continue;
        }

        return { ar, en, model, via: "client" };
      } catch (err) {
        lastError = err;
        if (err?.status && [404, 429, 500, 503].includes(err.status)) {
          break;
        }
        if (err?.code === "request-timeout") {
          break;
        }
        throw err;
      }
    }
  }

  throw lastError || createGeminiError("gemini-unavailable", 503, "");
}

/**
 * Offline / Fallback Smart Formatter so admin is never blocked even without API access.
 */
export function generateLocalFallbackDescription({ rawNotes, tags = "", title = "" }) {
  const cleanNotes = String(rawNotes || "").trim().replace(/\s+/g, " ");
  const tagList = String(tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const techText = tagList.length ? tagList.join("، ") : "تقنيات برمجية حديثة";
  const techTextEn = tagList.length ? tagList.join(", ") : "modern web & scripting tools";
  const cleanTitle = String(title || "").trim();

  const hasArabic = /[\u0600-\u06FF]/.test(cleanNotes);

  const ar = hasArabic
    ? `${cleanNotes.endsWith(".") ? cleanNotes : `${cleanNotes}.`} مبني باستخدام ${techText}، ويتضمّن ملف ZIP الكود المصدري الكامل جاهزاً للتشغيل والتعديل المباشر.`
    : `${cleanTitle ? `مشروع ${cleanTitle}: ` : ""}${cleanNotes}. مبني باستخدام ${techText}، ويتضمّن ملف ZIP الكود المصدري المنظّم وجاهزاً للتشغيل الفوري.`;

  const en = !hasArabic
    ? `${cleanNotes.endsWith(".") ? cleanNotes : `${cleanNotes}.`} Built with ${techTextEn}, packaged as a clean, ready-to-run ZIP archive.`
    : `${cleanTitle ? `${cleanTitle} — ` : ""}A practical developer utility built with ${techTextEn}. Includes the complete source code packaged in a ready-to-run ZIP archive.`;

  return { ar, en, via: "local" };
}
