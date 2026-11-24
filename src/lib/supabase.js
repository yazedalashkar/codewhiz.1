import { createClient } from "@supabase/supabase-js";
import { withTimeout } from "./diagnostics";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const SUPABASE_BUCKET =
  import.meta.env.VITE_SUPABASE_BUCKET || "codewhiz-vault";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function sanitizeFileName(originalName) {
  const dotIndex = originalName.lastIndexOf(".");
  const ext = dotIndex !== -1 ? originalName.slice(dotIndex).toLowerCase() : "";
  const base = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName;
  const cleanBase = base
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return `${cleanBase || "file"}${ext}`;
}

export async function uploadToSupabase(folder, file) {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error("supabase-missing-env");
    err.code = "supabase-missing-env";
    throw err;
  }

  const safeName = sanitizeFileName(file.name);
  const filePath = `${folder}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await withTimeout(
    supabase.storage.from(SUPABASE_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    }),
    45000
  );

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("تعذّر الحصول على رابط الملف العام من Supabase");
  }

  return data.publicUrl;
}
