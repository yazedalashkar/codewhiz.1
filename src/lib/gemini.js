import { buildPrompt, runGemini } from "../../api/_gemini.js";
import { getIdToken } from "./firebase";

export { TONES } from "../../api/_gemini.js";

function fail(code, extra = {}) {
  const err = new Error(code);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

const cleanKey = () =>
  (import.meta.env.VITE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");

/**
 * 1) Try the server route /api/describe (key stays secret, works from regions where Google blocks Gemini).
 * 2) If the route doesn't exist (local `vite dev`) or is unreachable, call Gemini directly with VITE_GEMINI_API_KEY.
 */
export async function generateProjectCopy({ rawNotes, tags, title, tone }) {
  if (!rawNotes || !rawNotes.trim()) throw fail("gemini-empty-notes");

  let serverError = null;
  try {
    const token = await getIdToken();
    const res = await fetch("/api/describe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ rawNotes, tags, title, tone }),
    });
    const isJson = (res.headers.get("content-type") || "").includes("application/json");

    if (res.ok && isJson) return { ...(await res.json()), via: "server" };

    if (isJson) {
      const body = await res.json().catch(() => ({}));
      const e = body?.error || {};
      serverError = fail(e.code || `gemini-${res.status}`, {
        status: e.status || res.status,
        googleMessage: e.message || "",
      });
    }
    // Non-JSON or 404 = route not deployed (vite dev) -> fall through to direct call.
  } catch {
    // network error reaching our own server -> fall through
  }

  if (serverError && ["ai-unauthorized", "gemini-empty-notes"].includes(serverError.code)) throw serverError;

  const apiKey = cleanKey();
  if (!apiKey) throw serverError || fail("gemini-missing-key");

  try {
    return { ...(await runGemini({ apiKey, prompt: buildPrompt({ rawNotes, tags, title, tone }) })), via: "browser" };
  } catch (err) {
    throw err || serverError;
  }
}

// Last-resort draft when every AI route failed. Not AI: it only tidies the notes into a template.
export function localDraft({ rawNotes, tags }) {
  const notes = rawNotes.trim().replace(/\s+/g, " ").replace(/[.\u06D4]+$/, "");
  const techs = (tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3).join(" / ");
  const isArabic = /[\u0600-\u06FF]/.test(notes);
  const ar = isArabic
    ? `${notes}. حمّل ملف ZIP لتحصل على الكود المصدري كاملاً وجاهزاً للتشغيل.`
    : `مشروع${techs ? ` بتقنية ${techs}` : ""}. حمّل ملف ZIP لتحصل على الكود المصدري كاملاً وجاهزاً للتشغيل.`;
  const en = isArabic
    ? `Source code${techs ? ` built with ${techs}` : ""}. Download the ZIP to get the full project, ready to run.`
    : `${notes}. Download the ZIP to get the full source, ready to run.`;
  return { ar, en, title: "", tags: [], via: "local" };
}
