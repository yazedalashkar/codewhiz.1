import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  Upload,
  Wand2,
  Trash2,
  FileArchive,
  Image as ImageIcon,
  Instagram,
  ArrowLeft,
  Star,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  LogOut,
} from "lucide-react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import {
  auth,
  db,
  isFirebaseConfigured,
  loginWithEmail,
  registerWithEmail,
  grantAdminRoleWithSecret,
  logoutUser,
} from "../lib/firebase";
import { uploadToSupabase, isSupabaseConfigured } from "../lib/supabase";
import { generateBilingualDescription } from "../lib/gemini";
import { diagnoseError, withTimeout } from "../lib/diagnostics";

const STUDIO_EASE = [0.22, 1, 0.36, 1];

export default function AdminVault() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkStatusText, setCheckStatusText] = useState("جاري التحقق من الجلسة...");

  // Auth / Upgrade States
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("yazedalashkar");
  const [secretCode, setSecretCode] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [upgradingRole, setUpgradingRole] = useState(false);
  const [authDiagnostic, setAuthDiagnostic] = useState(null);

  // Project Form States
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("Python, ASCII, CLI");
  const [rawNotes, setRawNotes] = useState("");
  const [instaUrl, setInstaUrl] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);

  // Action Loading & Status States
  const [aiLoading, setAiLoading] = useState(false);
  const [publishingStep, setPublishingStep] = useState("");
  const [formNotice, setFormNotice] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [busyProjectId, setBusyProjectId] = useState("");

  const verifyUserRole = useCallback(async (u) => {
    if (!u || !db) {
      setIsAdmin(false);
      setCheckingAuth(false);
      return;
    }

    setCheckingAuth(true);
    setCheckStatusText("جاري فحص صلاحيات المشرف في قاعدة البيانات...");

    try {
      let snap = await withTimeout(getDoc(doc(db, "users", u.uid)), 8000);
      if (!snap.exists()) {
        setCheckStatusText("جاري مزامنة سجل الحساب...");
        await new Promise((r) => setTimeout(r, 900));
        snap = await withTimeout(getDoc(doc(db, "users", u.uid)), 8000);
      }
      setIsAdmin(snap.exists() && snap.data().role === "admin");
      setAuthDiagnostic(null);
    } catch (err) {
      setAuthDiagnostic(diagnoseError(err, "ar"));
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setAuthDiagnostic(diagnoseError({ code: "missing-env" }, "ar"));
      setCheckingAuth(false);
      return;
    }

    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        verifyUserRole(u);
      } else {
        setIsAdmin(false);
        setCheckingAuth(false);
      }
    });

    return () => unsub();
  }, [verifyUserRole]);

  useEffect(() => {
    if (!isAdmin || !db) return;
    setLoadingProjects(true);
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingProjects(false);
      },
      (err) => {
        setFormNotice({ type: "error", ...diagnoseError(err, "ar") });
        setLoadingProjects(false);
      }
    );
  }, [isAdmin]);

  const handleAdminAuth = async (e) => {
    e.preventDefault();
    setAuthDiagnostic(null);
    setAuthSubmitting(true);
    try {
      if (authMode === "register") {
        if (secretCode.trim() !== import.meta.env.VITE_ADMIN_SECRET_CODE) {
          throw new Error("رمز الأمان الإداري غير مطابق للقيمة في ملف .env");
        }
        await registerWithEmail({ email, password, username, isAdmin: true });
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setAuthDiagnostic(diagnoseError(err, "ar"));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleUpgradeCurrentUser = async (e) => {
    e.preventDefault();
    setAuthDiagnostic(null);
    setUpgradingRole(true);
    try {
      if (secretCode.trim() !== import.meta.env.VITE_ADMIN_SECRET_CODE) {
        throw new Error("رمز الأمان الإداري غير صحيح");
      }
      await grantAdminRoleWithSecret(user, username);
      await verifyUserRole(user);
    } catch (err) {
      setAuthDiagnostic(diagnoseError(err, "ar"));
    } finally {
      setUpgradingRole(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!rawNotes.trim()) {
      setFormNotice({
        type: "error",
        title: "الوصف البسيط مطلوب",
        detail: "اكتب فكرة المشروع أو الوصف البسيط أولاً ليتمكن الذكاء الاصطناعي من صياغته.",
      });
      return;
    }
    setAiLoading(true);
    setFormNotice(null);
    try {
      const res = await generateBilingualDescription({ rawNotes, tags });
      setDescAr(res.ar);
      setDescEn(res.en);
      setFormNotice({
        type: "success",
        title: "تم توليد الوصف من شرحك البسيط بنجاح",
        detail: "يمكنك مراجعة النصين العربي والإنكليزي وتعديلهما قبل النشر.",
      });
    } catch (err) {
      setFormNotice({ type: "error", ...diagnoseError(err, "ar") });
    } finally {
      setAiLoading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setFormNotice({
        type: "error",
        ...diagnoseError({ code: "supabase-missing-env" }, "ar"),
      });
      return;
    }

    if (!imageFile || !zipFile) {
      setFormNotice({
        type: "error",
        title: "ملفات ناقصة",
        detail: "يرجى إرفاق الصورة التوضيحية وملف الكود المضغوط (.zip) معاً.",
      });
      return;
    }

    setFormNotice(null);
    try {
      setPublishingStep("image");
      const imageUrl = await uploadToSupabase("previews", imageFile);

      setPublishingStep("zip");
      const zipUrl = await uploadToSupabase("zips", zipFile);

      setPublishingStep("saving");
      await withTimeout(
        addDoc(collection(db, "projects"), {
          title: title.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          description_ar: descAr.trim(),
          description_en: descEn.trim(),
          instaUrl: instaUrl.trim(),
          imageUrl,
          zipUrl,
          featured,
          createdAt: serverTimestamp(),
        }),
        10000
      );

      setTitle("");
      setRawNotes("");
      setInstaUrl("");
      setDescAr("");
      setDescEn("");
      setImageFile(null);
      setZipFile(null);
      setFeatured(false);

      setFormNotice({
        type: "success",
        title: "تم نشر المشروع بنجاح",
        detail: "تم رفع الملفات إلى Supabase Storage ونشر المشروع في الواجهة الرئيسية.",
      });
    } catch (err) {
      setFormNotice({ type: "error", ...diagnoseError(err, "ar") });
    } finally {
      setPublishingStep("");
    }
  };

  const handleToggleFeatured = async (project) => {
    setBusyProjectId(project.id);
    try {
      await updateDoc(doc(db, "projects", project.id), {
        featured: !project.featured,
      });
    } catch (err) {
      setFormNotice({ type: "error", ...diagnoseError(err, "ar") });
    } finally {
      setBusyProjectId("");
    }
  };

  const handleDeleteProject = async (projectId) => {
    setBusyProjectId(projectId);
    try {
      await deleteDoc(doc(db, "projects", projectId));
    } catch (err) {
      setFormNotice({ type: "error", ...diagnoseError(err, "ar") });
    } finally {
      setBusyProjectId("");
    }
  };

  const getPublishLabel = () => {
    if (publishingStep === "image") return "1/3 جاري رفع الصورة إلى Supabase...";
    if (publishingStep === "zip") return "2/3 جاري رفع ملف الـ ZIP...";
    if (publishingStep === "saving") return "3/3 جاري حفظ البيانات...";
    return "نشر المشروع";
  };

  if (checkingAuth) {
    return (
      <div
        className="h-dvh bg-[#09090B] studio-grid text-zinc-100 flex flex-col items-center justify-center gap-3 p-4"
        dir="rtl"
      >
        <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
        <p className="text-xs text-zinc-400">{checkStatusText}</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div
        className="h-dvh bg-[#09090B] studio-grid text-zinc-100 flex items-center justify-center p-4"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: STUDIO_EASE }}
          className="w-full max-w-sm rounded-2xl bg-[#111114] border border-zinc-800 p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Lock className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <h1 className="font-bold text-base text-zinc-100">إدارة المحتوى</h1>
                <p className="text-[11px] text-zinc-500 font-mono">codewhiz.1</p>
              </div>
            </div>
            {user && (
              <button
                onClick={() => verifyUserRole(user)}
                title="إعادة فحص الصلاحيات"
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {user && !isAdmin ? (
            <form onSubmit={handleUpgradeCurrentUser} className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <p className="text-xs font-semibold text-zinc-200">
                  أنت مسجّل الدخول حالياً بـ:
                </p>
                <p className="text-[11px] font-mono text-sky-300 truncate">
                  {user.email}
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                  هذا الحساب لا يملك سجل مشرف في Firestore بعد. أدخل رمز الأمان لتفعيل صلاحياتك فوراً:
                </p>
              </div>

              <input
                type="text"
                required
                placeholder="اسم المستخدم (Username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono"
              />

              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute top-3.5 start-3.5" />
                <input
                  type="password"
                  required
                  placeholder="رمز الأمان الإداري (CW_YAZED_2026)"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  className="w-full h-10 ps-9 pe-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono"
                />
              </div>

              {authDiagnostic && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{authDiagnostic.title}</span>
                  </div>
                  <p className="text-[11px] text-red-300/90 leading-relaxed">
                    {authDiagnostic.detail}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={upgradingRole}
                className="w-full h-10 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {upgradingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {upgradingRole ? "جاري تفعيل الصلاحيات..." : "تفعيل صلاحية المشرف"}
                </span>
              </button>

              <button
                type="button"
                onClick={logoutUser}
                className="w-full h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج واستخدام بريد آخر</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminAuth} className="space-y-3">
              {authMode === "register" && (
                <>
                  <input
                    type="text"
                    required
                    disabled={authSubmitting}
                    placeholder="اسم المستخدم (Username)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono disabled:opacity-50"
                  />
                  <input
                    type="password"
                    required
                    disabled={authSubmitting}
                    placeholder="رمز الأمان الإداري"
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono disabled:opacity-50"
                  />
                </>
              )}

              <input
                type="email"
                required
                disabled={authSubmitting}
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs disabled:opacity-50"
              />
              <input
                type="password"
                required
                disabled={authSubmitting}
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs disabled:opacity-50"
              />

              {authDiagnostic && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{authDiagnostic.title}</span>
                  </div>
                  <p className="text-[11px] text-red-300/90 leading-relaxed">
                    {authDiagnostic.detail}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full h-10 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {authSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {authSubmitting
                    ? "جاري التحقق..."
                    : authMode === "login"
                    ? "تسجيل الدخول"
                    : "إنشاء حساب المشرف"}
                </span>
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            {!user ? (
              <button
                onClick={() => {
                  setAuthDiagnostic(null);
                  setAuthMode(authMode === "login" ? "register" : "login");
                }}
                className="hover:text-zinc-200 transition-colors"
              >
                {authMode === "login" ? "إنشاء حساب مشرف" : "تسجيل الدخول"}
              </button>
            ) : (
              <span className="text-[11px] font-mono text-zinc-500">uid: {user.uid.slice(0, 6)}...</span>
            )}
            <Link to="/" className="hover:text-zinc-200 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> الواجهة الرئيسية
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const isPublishing = Boolean(publishingStep);

  return (
    <div className="h-dvh bg-[#09090B] text-zinc-100 flex flex-col overflow-hidden" dir="rtl">
      <header className="h-14 px-6 border-b border-zinc-800 bg-[#111114] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-semibold text-sm text-zinc-100">codewhiz.1</span>
          <span className="text-zinc-600">/</span>
          <span className="text-xs text-zinc-400">لوحة نشر المشاريع</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> معاينة الموقع
          </Link>
          <button
            onClick={logoutUser}
            title="تسجيل الخروج"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 md:p-6 overflow-y-auto vault-scroll">
        {/* Publish Project Form */}
        <form
          onSubmit={handlePublish}
          className="lg:col-span-7 rounded-2xl bg-[#111114] border border-zinc-800 p-5 space-y-4 h-fit"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-zinc-100">إضافة مشروع جديد</h2>
            <span className="text-[11px] font-mono text-zinc-500">Supabase Storage</span>
          </div>

          {!isSupabaseConfigured && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                مفاتيح <b>VITE_SUPABASE_URL</b> و <b>VITE_SUPABASE_ANON_KEY</b> غير مضافة في ملف <code>.env</code> بعد.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              required
              disabled={isPublishing}
              placeholder="عنوان المشروع"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 outline-none text-xs disabled:opacity-50"
            />
            <input
              type="text"
              disabled={isPublishing}
              placeholder="التقنيات (Python, ASCII, React)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 outline-none text-xs font-mono disabled:opacity-50"
            />
          </div>

          <div className="relative">
            <Instagram className="w-4 h-4 text-zinc-500 absolute top-3 start-3.5" />
            <input
              type="url"
              disabled={isPublishing}
              placeholder="رابط فيديو الريلز على إنستغرام (اختياري)"
              value={instaUrl}
              onChange={(e) => setInstaUrl(e.target.value)}
              className="w-full h-10 ps-10 pe-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 outline-none text-xs font-mono disabled:opacity-50"
            />
          </div>

          {/* Bilingual AI Description Generator */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-300">
                الوصف البسيط (يصيغه الذكاء الاصطناعي بالعربي والإنكليزي):
              </span>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={aiLoading || isPublishing}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>
                  {aiLoading ? "جاري الصياغة بالـ AI..." : "صياغة الوصف بالـ AI"}
                </span>
              </button>
            </div>

            <textarea
              rows={2}
              disabled={aiLoading || isPublishing}
              placeholder="اكتب هنا شرحاً بسيطاً لما يفعله الكود ليقوم الذكاء الاصطناعي بصياغته بشكل احترافي بالعربي والإنكليزي..."
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[#111114] border border-zinc-800 focus:border-zinc-600 outline-none text-xs leading-relaxed disabled:opacity-50"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <textarea
                rows={3}
                required
                disabled={aiLoading || isPublishing}
                placeholder="الوصف النهائي بالعربي..."
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                className="p-2.5 rounded-lg bg-[#111114] border border-zinc-800 focus:border-zinc-600 outline-none text-xs leading-relaxed disabled:opacity-50"
              />
              <textarea
                rows={3}
                required
                dir="ltr"
                disabled={aiLoading || isPublishing}
                placeholder="Final English description..."
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                className="p-2.5 rounded-lg bg-[#111114] border border-zinc-800 focus:border-zinc-600 outline-none text-xs leading-relaxed disabled:opacity-50"
              />
            </div>
          </div>

          {/* File Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="h-20 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950/70 flex flex-col items-center justify-center cursor-pointer text-xs text-zinc-400 gap-1.5 transition-colors px-3 text-center">
              <ImageIcon className="w-4 h-4 text-zinc-300" />
              <span className="truncate max-w-full">
                {imageFile ? imageFile.name : "إرفاق صورة توضيحية للمشروع"}
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={isPublishing}
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </label>

            <label className="h-20 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950/70 flex flex-col items-center justify-center cursor-pointer text-xs text-zinc-400 gap-1.5 transition-colors px-3 text-center">
              <FileArchive className="w-4 h-4 text-zinc-300" />
              <span className="truncate max-w-full">
                {zipFile ? zipFile.name : "إرفاق ملف الكود المضغوط (.ZIP)"}
              </span>
              <input
                type="file"
                accept=".zip,.rar,.7z"
                disabled={isPublishing}
                className="hidden"
                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {formNotice && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                formNotice.type === "error"
                  ? "bg-red-500/10 border-red-500/25 text-red-200"
                  : "bg-sky-500/10 border-sky-500/25 text-sky-200"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {formNotice.type === "error" ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <span>{formNotice.title}</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {formNotice.detail}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                disabled={isPublishing}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-950 accent-sky-400"
              />
              <span>تمييز المشروع في تبويب المختارات</span>
            </label>

            <button
              type="submit"
              disabled={isPublishing}
              className="px-5 h-9 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              {isPublishing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{getPublishLabel()}</span>
            </button>
          </div>
        </form>

        {/* Published Projects Manager */}
        <div className="lg:col-span-5 rounded-2xl bg-[#111114] border border-zinc-800 p-5 flex flex-col h-fit max-h-[78vh]">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-bold text-sm text-zinc-100">المشاريع المنشورة</h2>
            <span className="text-xs font-mono text-zinc-500 tabular-nums">
              {loadingProjects ? "..." : projects.length}
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto vault-scroll pe-1">
            {loadingProjects ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">جاري تحميل المشاريع...</span>
              </div>
            ) : projects.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">
                لم يتم نشر أي مشروع بعد
              </p>
            ) : (
              projects.map((p) => {
                const isItemBusy = busyProjectId === p.id;
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-11 h-11 rounded-lg object-cover border border-zinc-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-zinc-100 truncate">
                          {p.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
                          {(p.tags || []).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleFeatured(p)}
                        disabled={isItemBusy}
                        title="تمييز"
                        className={`p-2 rounded-lg border transition-colors disabled:opacity-50 ${
                          p.featured
                            ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {isItemBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Star className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteProject(p.id)}
                        disabled={isItemBusy}
                        title="حذف"
                        className="p-2 rounded-lg bg-zinc-900 hover:bg-red-500/15 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
