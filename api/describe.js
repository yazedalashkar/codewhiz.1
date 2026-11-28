import { buildPrompt, runGemini } from "./_gemini.js";

function send(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function uidFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return payload.user_id || payload.sub || "";
  } catch {
    return "";
  }
}

// Firestore itself verifies the token and applies the rules, so a forged token or uid is rejected there.
async function isAdmin(projectId, token) {
  const uid = uidFromToken(token);
  if (!uid || !projectId) return false;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins/${uid}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, "method-not-allowed", "POST only");

  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!apiKey) return send(res, 500, "gemini-missing-key", "GEMINI_API_KEY is not set on the server");

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!token || !(await isAdmin(projectId, token))) {
    return send(res, 403, "ai-unauthorized", "Admin sign-in required");
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!String(body.rawNotes || "").trim()) return send(res, 400, "gemini-empty-notes", "rawNotes is empty");

  try {
    const result = await runGemini({ apiKey, prompt: buildPrompt(body) });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(502).json({
      error: {
        code: err.code || "gemini-unavailable",
        status: err.status,
        message: err.googleMessage || err.message,
      },
    });
  }
}
