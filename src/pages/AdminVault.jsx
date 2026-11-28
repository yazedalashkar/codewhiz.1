import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Upload, Wand2, Trash2, FileArchive, Image as ImageIcon, Instagram, ArrowRight, Star,
  CheckCircle2, Loader2, AlertCircle, AlertTriangle, RefreshCw, LogOut, Copy, Check, Pencil, X, Eye,
} from "lucide-react";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import {
  auth, db, isFirebaseConfigured, loginWithEmail, loginWithGoogle, registerWithEmail, logoutUser, checkIsAdmin,
} from "../lib/firebase";
import { uploadToSupabase, isSupabaseConfigured } from "../lib/supabase";
import { generateProjectCopy, localDraft } from "../lib/gemini";
import { diagnoseError, withTimeout } from "../lib/diagnostics";
import { formatSize } from "../lib/format";

const EASE = [0.22, 1, 0.36, 1];
const DRAFT_KEY = "cw-admin-draft";
const MAX_BYTES = 50 * 1024 * 1024;
const TONES = [
  { id: "technical", label: "تقني" },
  { id: "concise", label: "مختصر" },
  { id: "friendly", label: "مبسّط" },
];
const VIA_LABEL = {
  server: "صيغ عبر الخادم",
  browser: "صيغ مباشرة من المتصفح",
  local: "مسودة محلية بدون ذكاء اصطناعي",
};

const emptyForm = { title: "", tags: "", instaUrl: "", rawNotes: "", descAr: "", descEn: "", featured: false };

function Notice({ n, onClose }) {
  if (!n) return null;
  const styles = {
    error: ["bg-flare/15 border-flare/40", AlertCircle, "text-flare"],
    warn: ["bg-sun/15 border-sun/40", AlertTriangle, "text-sun"],
    success: ["bg-iris/20 border-iris/50", CheckCircle2, "text-iris"],
  }[n.type || "error"];
  const Icon = styles[1];
  return (
    <div role="alert" className={`p-3.5 rounded-2xl border-2 text-sm flex items-start gap-3 ${styles[0]}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${styles[2]}`} />
      <div className="flex-1 space-y-1">
        <p className="font-semibold">{n.title}</p>
        {n.detail && <p className="text-bone/75 leading-6">{n.detail}</p>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="إغلاق" className="h-8 w-8 -m-1 flex items-center justify-center text-bone/50">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function DropZone({ icon: Icon, label, accept, file, preview, onFile, disabled }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && !disabled) onFile(f); }}
      className={`relative min-h-[112px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-center px-3 py-4 cursor-pointer overflow-hidden transition-colors ${
        over ? "border-sun bg-sun/10" : file ? "border-iris/60 bg-iris/10" : "border-haze bg-ink"
      }`}
    >
      {preview && <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />}
      <Icon className="w-6 h-6 text-bone/80 relative" />
      <span className="relative text-sm text-bone/80 break-all line-clamp-2">{file ? file.name : label}</span>
      {file && <span className="relative text-xs text-bone/50 tabular-nums">{formatSize(file.size)}</span>}
      <input type="file" accept={accept} disabled={disabled} className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
    </label>
  );
}

export default function AdminVault() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authBusy, setAuthBusy] = useState("");
  const [authDiag, setAuthDiag] = useState(null);
  const [uidCopied, setUidCopied] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const [imageFile, setImageFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [editing, setEditing] = useState(null);

  const [tone, setTone] = useState("technical");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMeta, setAiMeta] = useState(null);
  const [suggest, setSuggest] = useState(null);
  const [step, setStep] = useState("");
  const [notice, setNotice] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [busyId, setBusyId] = useState("");
  const formTop = useRef(null);

  /* ---- admin gate: /admins/{uid} (clients can read their own doc, never write it) ---- */
  const verify = useCallback(async (u) => {
    if (!u) { setIsAdmin(false); setChecking(false); return; }
    setChecking(true);
    try {
      setIsAdmin(await checkIsAdmin(u.uid));
      setAuthDiag(null);
    } catch (err) {
      setAuthDiag(diagnoseError(err, "ar"));
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setAuthDiag(diagnoseError({ code: "missing-env" }, "ar"));
      setChecking(false);
      return;
    }
    return auth.onAuthStateChanged((u) => { setUser(u); verify(u); });
  }, [verify]);

  useEffect(() => {
    if (!isAdmin || !db) return;
    setLoadingProjects(true);
    return onSnapshot(
      query(collection(db, "projects"), orderBy("createdAt", "desc")),
      (snap) => { setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoadingProjects(false); },
      (err) => { setNotice({ type: "error", ...diagnoseError(err, "ar") }); setLoadingProjects(false); }
    );
  }, [isAdmin]);

  /* ---- draft autosave (survives refresh / accidental close) ---- */
  useEffect(() => {
    if (!isAdmin) return;
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (saved) setForm({ ...emptyForm, ...saved });
    } catch { /* storage blocked */ }
  }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin || editing) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore */ }
  }, [form, isAdmin, editing]);

  useEffect(() => {
    if (!imageFile) { setImagePreview(""); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  /* ---- auth handlers ---- */
  const runAuth = async (kind, fn) => {
    setAuthDiag(null);
    setAuthBusy(kind);
    try { await fn(); } catch (err) { setAuthDiag(diagnoseError(err, "ar")); } finally { setAuthBusy(""); }
  };
  const submitAuth = (e) => {
    e.preventDefault();
    runAuth("email", () => (authMode === "register" ? registerWithEmail({ email, password, username }) : loginWithEmail(email, password)));
  };
  const copyUid = async () => {
    try { await navigator.clipboard.writeText(user.uid); setUidCopied(true); setTimeout(() => setUidCopied(false), 1800); } catch { /* ignore */ }
  };

  /* ---- AI drafting ---- */
  const generate = async () => {
    if (!form.rawNotes.trim()) {
      setNotice({ type: "error", ...diagnoseError({ code: "gemini-empty-notes" }, "ar") });
      return;
    }
    setAiBusy(true);
    setNotice(null);
    setSuggest(null);
    try {
      const res = await generateProjectCopy({ rawNotes: form.rawNotes, tags: form.tags, title: form.title, tone });
      setForm((f) => ({ ...f, descAr: res.ar, descEn: res.en }));
      setAiMeta({ via: res.via, model: res.model });
      if ((res.title && res.title !== form.title) || res.tags?.length) setSuggest({ title: res.title, tags: res.tags || [] });
      setNotice({ type: "success", title: "تمت الصياغة", detail: "راجع النصين وعدّلهما قبل النشر." });
    } catch (err) {
      const d = diagnoseError(err, "ar");
      const draft = localDraft({ rawNotes: form.rawNotes, tags: form.tags });
      setForm((f) => ({ ...f, descAr: draft.ar, descEn: draft.en }));
      setAiMeta({ via: "local" });
      setNotice({ type: "warn", title: d.title, detail: `${d.detail} وُضعت مسودة محلية بسيطة (ليست من الذكاء الاصطناعي) لتعدّلها يدوياً.` });
    } finally {
      setAiBusy(false);
    }
  };

  const mergeTags = (extra) => {
    const cur = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const lower = new Set(cur.map((t) => t.toLowerCase()));
    setForm((f) => ({ ...f, tags: [...cur, ...extra.filter((t) => !lower.has(t.toLowerCase()))].join(", ") }));
  };

  /* ---- publish / update ---- */
  const resetForm = () => {
    setForm(emptyForm); setImageFile(null); setZipFile(null); setEditing(null); setAiMeta(null); setSuggest(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const publish = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured && (imageFile || zipFile || !editing)) {
      setNotice({ type: "error", ...diagnoseError({ code: "supabase-missing-env" }, "ar") });
      return;
    }
    if (!editing && (!imageFile || !zipFile)) {
      setNotice({ type: "error", title: "ملفات ناقصة", detail: "أرفق الصورة التوضيحية وملف الكود المضغوط معاً." });
      return;
    }
    if (zipFile && zipFile.size > MAX_BYTES) {
      setNotice({ type: "error", ...diagnoseError({ code: "payload too large" }, "ar") });
      return;
    }
    setNotice(null);
    try {
      const data = {
        title: form.title.trim(),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        description_ar: form.descAr.trim(),
        description_en: form.descEn.trim(),
        instaUrl: form.instaUrl.trim(),
        featured: form.featured,
      };
      if (imageFile) { setStep("image"); data.imageUrl = await uploadToSupabase("previews", imageFile); }
      if (zipFile) { setStep("zip"); data.zipUrl = await uploadToSupabase("zips", zipFile); data.zipSize = zipFile.size; }

      setStep("saving");
      if (editing) {
        await withTimeout(updateDoc(doc(db, "projects", editing), { ...data, updatedAt: serverTimestamp() }), 10000);
      } else {
        await withTimeout(addDoc(collection(db, "projects"), { ...data, downloads: 0, createdAt: serverTimestamp() }), 10000);
      }
      const wasEditing = Boolean(editing);
      resetForm();
      setNotice({ type: "success", title: wasEditing ? "تم تحديث المشروع" : "تم نشر المشروع", detail: "التغيير ظاهر الآن في الواجهة الرئيسية." });
    } catch (err) {
      setNotice({ type: "error", ...diagnoseError(err, "ar") });
    } finally {
      setStep("");
    }
  };

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({
      title: p.title || "", tags: (p.tags || []).join(", "), instaUrl: p.instaUrl || "", rawNotes: "",
      descAr: p.description_ar || "", descEn: p.description_en || "", featured: Boolean(p.featured),
    });
    setImageFile(null); setZipFile(null); setAiMeta(null); setSuggest(null); setNotice(null);
    formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleFeatured = async (p) => {
    setBusyId(p.id);
    try { await updateDoc(doc(db, "projects", p.id), { featured: !p.featured }); }
    catch (err) { setNotice({ type: "error", ...diagnoseError(err, "ar") }); }
    finally { setBusyId(""); }
  };
  const remove = async (p) => {
    if (!window.confirm(`حذف «${p.title}» نهائياً؟`)) return;
    setBusyId(p.id);
    try { await deleteDoc(doc(db, "projects", p.id)); if (editing === p.id) resetForm(); }
    catch (err) { setNotice({ type: "error", ...diagnoseError(err, "ar") }); }
    finally { setBusyId(""); }
  };

  const publishing = Boolean(step);
  const publishLabel = { image: "1/3 رفع الصورة…", zip: "2/3 رفع ملف ZIP…", saving: "3/3 حفظ البيانات…" }[step] || (editing ? "حفظ التعديلات" : "نشر المشروع");

  /* ================= screens ================= */
  const shell = "min-h-dvh bg-ink text-bone";

  if (checking) {
    return (
      <div dir="rtl" className={`${shell} flex flex-col items-center justify-center gap-3`}>
        <Loader2 className="w-7 h-7 animate-spin text-flare" />
        <p className="text-sm text-bone/60">جاري التحقق من الجلسة…</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div dir="rtl" className={`${shell} flex items-center justify-center p-4 py-10`}>
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-sm rounded-[28px] bg-plum border-2 border-haze p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-flare text-ink flex items-center justify-center rotate-[-6deg]"><Lock className="w-5 h-5" /></span>
              <div>
                <h1 className="font-display text-2xl leading-none">لوحة النشر</h1>
                <p className="text-xs text-bone/50 mt-1">codewhiz.1</p>
              </div>
            </div>
            {user && (
              <button onClick={() => verify(user)} aria-label="إعادة الفحص" className="h-11 w-11 rounded-full bg-ink flex items-center justify-center text-bone/70 active:scale-95">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-ink space-y-2">
                <p className="text-sm font-semibold">هذا الحساب ليس مشرفاً بعد</p>
                <p className="text-xs text-bone/60 break-all">{user.email}</p>
                <ol className="text-xs text-bone/75 leading-6 list-decimal ps-5 space-y-1 pt-1">
                  <li>انسخ المعرّف (UID) بالأسفل.</li>
                  <li>في Firebase Console ← Firestore أنشئ مجموعة <b>admins</b>.</li>
                  <li>أضف وثيقة معرّفها هو الـ UID نفسه (الحقول فارغة تكفي).</li>
                  <li>ارجع هنا واضغط زر إعادة الفحص.</li>
                </ol>
              </div>
              <button onClick={copyUid} className="w-full h-12 rounded-2xl bg-ink border-2 border-haze font-mono text-xs flex items-center justify-between px-4 active:scale-[0.98]">
                <span className="truncate" dir="ltr">{user.uid}</span>
                {uidCopied ? <Check className="w-4 h-4 text-sun shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
              </button>
              {authDiag && <Notice n={{ type: "error", ...authDiag }} />}
              <button onClick={logoutUser} className="w-full h-11 rounded-2xl text-sm text-bone/60 flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> تسجيل الخروج واستخدام حساب آخر
              </button>
            </div>
          ) : (
            <form onSubmit={submitAuth} className="space-y-3">
              <button type="button" onClick={() => runAuth("google", loginWithGoogle)} disabled={Boolean(authBusy)}
                className="w-full h-12 rounded-2xl bg-bone text-ink font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {authBusy === "google" && <Loader2 className="w-4 h-4 animate-spin" />} المتابعة مع Google
              </button>
              <div className="flex items-center gap-3 text-xs text-bone/40"><span className="h-px flex-1 bg-haze" />أو<span className="h-px flex-1 bg-haze" /></div>
              {authMode === "register" && (
                <input className="field" dir="ltr" required placeholder="اسم المستخدم (إنكليزي)" value={username} onChange={(e) => setUsername(e.target.value)} />
              )}
              <input className="field" dir="ltr" type="email" required autoComplete="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="field" dir="ltr" type="password" required minLength={6} autoComplete={authMode === "login" ? "current-password" : "new-password"} placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
              {authDiag && <Notice n={{ type: "error", ...authDiag }} />}
              <button type="submit" disabled={Boolean(authBusy)} className="w-full h-12 rounded-2xl bg-flare text-ink font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {authBusy === "email" && <Loader2 className="w-4 h-4 animate-spin" />}
                {authMode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
              </button>
              <button type="button" onClick={() => { setAuthDiag(null); setAuthMode(authMode === "login" ? "register" : "login"); }} className="w-full h-10 text-sm text-bone/60">
                {authMode === "login" ? "حساب جديد" : "لدي حساب"}
              </button>
            </form>
          )}

          <Link to="/" className="flex items-center justify-center gap-2 text-sm text-bone/60 pt-3 border-t-2 border-haze h-12">
            <ArrowRight className="w-4 h-4" /> الواجهة الرئيسية
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div dir="rtl" className={shell}>
      <header className="sticky top-0 z-30 bg-plum/95 backdrop-blur-md border-b-2 border-haze pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto h-14 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-flare text-ink font-mono font-bold text-xs flex items-center justify-center rotate-[-6deg]">cw</span>
            <span className="font-display text-lg">لوحة النشر</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="h-10 px-4 rounded-full bg-ink text-sm flex items-center gap-2 active:scale-95"><Eye className="w-4 h-4" /><span className="hidden sm:inline">معاينة الموقع</span></Link>
            <button onClick={logoutUser} aria-label="خروج" className="h-10 w-10 rounded-full bg-ink flex items-center justify-center text-bone/70 active:scale-95"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-5 p-4 md:p-6 pb-32 lg:pb-10">
        {/* FORM */}
        <form ref={formTop} onSubmit={publish} className="lg:col-span-7 rounded-[28px] bg-plum border-2 border-haze p-5 md:p-6 space-y-5 h-fit scroll-mt-20">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{editing ? "تعديل مشروع" : "مشروع جديد"}</h2>
            {(editing || form.title || form.descAr) && (
              <button type="button" onClick={resetForm} className="h-9 px-3 rounded-full bg-ink text-xs text-bone/70 active:scale-95">
                {editing ? "إلغاء التعديل" : "تفريغ النموذج"}
              </button>
            )}
          </div>

          {!isSupabaseConfigured && (
            <Notice n={{ type: "warn", title: "مفاتيح Supabase غير مضافة", detail: "أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env." }} />
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <input className="field" required disabled={publishing} placeholder="عنوان المشروع" value={form.title} onChange={set("title")} />
            <input className="field" dir="ltr" disabled={publishing} placeholder="Python, CLI, React" value={form.tags} onChange={set("tags")} />
          </div>
          <div className="relative">
            <Instagram className="w-4 h-4 text-bone/40 absolute top-1/2 -translate-y-1/2 start-4 pointer-events-none" />
            <input className="field ps-11" dir="ltr" type="url" disabled={publishing} placeholder="رابط الريلز على إنستغرام (اختياري)" value={form.instaUrl} onChange={set("instaUrl")} />
          </div>

          {/* AI drafting */}
          <div className="p-4 rounded-2xl bg-ink space-y-3.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-semibold">اكتب فكرتك بسرعة وسأصيغها بلغتين</p>
              <div className="flex gap-1 p-1 rounded-full bg-plum" role="radiogroup" aria-label="نبرة الصياغة">
                {TONES.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={tone === t.id} onClick={() => setTone(t.id)}
                    className={`h-8 px-3.5 rounded-full text-xs font-medium transition-colors ${tone === t.id ? "bg-sun text-ink" : "text-bone/65"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3} className="field" disabled={aiBusy || publishing}
              placeholder="مثال: سكربت بايثون يحوّل أي صورة إلى رسم ASCII ملوّن في الطرفية"
              value={form.rawNotes} onChange={set("rawNotes")}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); generate(); } }}
            />

            <button type="button" onClick={generate} disabled={aiBusy || publishing}
              className="w-full h-12 rounded-2xl bg-iris text-bone font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform">
              {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {aiBusy ? "جاري الصياغة…" : form.descAr ? "أعد الصياغة" : "صِغ الوصف"}
            </button>

            <AnimatePresence>
              {suggest && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="p-3 rounded-2xl bg-plum space-y-2 text-sm">
                    <p className="text-xs text-bone/50">اقتراحات من الذكاء الاصطناعي</p>
                    <div className="flex flex-wrap gap-2">
                      {suggest.title && !form.title && (
                        <button type="button" onClick={() => setForm((f) => ({ ...f, title: suggest.title }))} className="h-9 px-3 rounded-full bg-sun text-ink text-xs font-semibold">
                          العنوان: {suggest.title}
                        </button>
                      )}
                      {suggest.tags.length > 0 && (
                        <button type="button" onClick={() => mergeTags(suggest.tags)} className="h-9 px-3 rounded-full bg-sun text-ink text-xs font-semibold" dir="ltr">
                          + {suggest.tags.join(", ")}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <textarea rows={4} required className="field" disabled={aiBusy || publishing} placeholder="الوصف النهائي بالعربي" value={form.descAr} onChange={set("descAr")} />
                <p className="text-xs text-bone/40 mt-1 tabular-nums">{form.descAr.length} حرف</p>
              </div>
              <div>
                <textarea rows={4} required dir="ltr" className="field" disabled={aiBusy || publishing} placeholder="Final English description" value={form.descEn} onChange={set("descEn")} />
                <p className="text-xs text-bone/40 mt-1 tabular-nums" dir="ltr">{form.descEn.length} chars</p>
              </div>
            </div>
            {aiMeta && (
              <p className="text-xs text-bone/45 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                {VIA_LABEL[aiMeta.via]}{aiMeta.model ? ` (${aiMeta.model})` : ""}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <DropZone icon={ImageIcon} label={editing ? "استبدال الصورة (اختياري)" : "صورة المشروع"} accept="image/*" file={imageFile} preview={imagePreview} onFile={setImageFile} disabled={publishing} />
            <DropZone icon={FileArchive} label={editing ? "استبدال ملف ZIP (اختياري)" : "ملف الكود (.zip)"} accept=".zip,.rar,.7z" file={zipFile} onFile={setZipFile} disabled={publishing} />
          </div>
          {zipFile && zipFile.size > MAX_BYTES && (
            <Notice n={{ type: "warn", ...diagnoseError({ code: "payload too large" }, "ar") }} />
          )}

          <Notice n={notice} onClose={() => setNotice(null)} />

          {/* sticky on phones so the main action is always under the thumb */}
          <div className="fixed lg:static bottom-0 inset-x-0 z-30 p-3 pb-safe lg:p-0 bg-ink/90 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-t-2 border-haze lg:border-0 flex items-center gap-3">
            <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none h-12">
              <input type="checkbox" checked={form.featured} disabled={publishing} onChange={set("featured")} className="h-5 w-5 accent-[#FFC857]" />
              مختار
            </label>
            <button type="submit" disabled={publishing}
              className="flex-1 lg:flex-none lg:px-8 h-12 rounded-2xl bg-sun text-ink font-semibold flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98] transition-transform lg:ms-auto">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {publishLabel}
            </button>
          </div>
        </form>

        {/* LIST */}
        <div className="lg:col-span-5 rounded-[28px] bg-plum border-2 border-haze p-5 h-fit lg:sticky lg:top-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">المنشور</h2>
            <span className="text-sm text-bone/50 tabular-nums">{loadingProjects ? "…" : projects.length}</span>
          </div>
          <div className="space-y-2.5 lg:max-h-[70dvh] overflow-y-auto overscroll-contain">
            {loadingProjects ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-bone/50" /></div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-bone/50 py-8 text-center">لا مشاريع بعد.</p>
            ) : (
              projects.map((p) => {
                const b = busyId === p.id;
                return (
                  <div key={p.id} className={`p-3 rounded-2xl bg-ink flex items-center gap-3 border-2 ${editing === p.id ? "border-sun" : "border-transparent"}`}>
                    <img src={p.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm truncate">{p.title}</h4>
                      <p className="text-xs text-bone/45 truncate mt-0.5" dir="ltr">
                        {[(p.tags || []).join(", "), p.zipSize && formatSize(p.zipSize), p.downloads > 0 && `${p.downloads}↓`].filter(Boolean).join("  ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(p)} disabled={b} aria-label="تعديل" className="h-10 w-10 rounded-full bg-plum flex items-center justify-center text-bone/70 active:scale-95"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => toggleFeatured(p)} disabled={b} aria-label="تمييز" className={`h-10 w-10 rounded-full flex items-center justify-center active:scale-95 ${p.featured ? "bg-sun text-ink" : "bg-plum text-bone/70"}`}>
                        {b ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                      </button>
                      <button onClick={() => remove(p)} disabled={b} aria-label="حذف" className="h-10 w-10 rounded-full bg-plum flex items-center justify-center text-flare active:scale-95"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
