import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Pencil,
  X,
  Users,
  Download,
  Layers,
  Sparkles,
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
import {
  generateBilingualDescription,
  generateLocalFallbackDescription,
} from "../lib/gemini";
import { diagnoseError, withTimeout } from "../lib/diagnostics";
import {
  subscribeMonthlyVisitors,
  formatMonthLabel,
  getDaysRemainingInMonth,
} from "../lib/analytics";
import { useToast } from "../components/ToastProvider";

const STUDIO_EASE = [0.22, 1, 0.36, 1];
const MAX_SUPABASE_BYTES = 50 * 1024 * 1024; // 50MB

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminVault() {
  const toast = useToast();

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
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("Python, ASCII, CLI");
  const [rawNotes, setRawNotes] = useState("");
  const [aiTone, setAiTone] = useState("technical");
  const [instaUrl, setInstaUrl] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [zipFile, setZipFile] = useState(null);

  const imageInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // Action Loading & Status States
  const [aiLoading, setAiLoading] = useState(false);
  const [publishingStep, setPublishingStep] = useState("");
  const [formNotice, setFormNotice] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [busyProjectId, setBusyProjectId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");

  // Monthly Visitors Telemetry
  const [visitorStats, setVisitorStats] = useState({
    count: 0,
    monthKey: "",
    loading: true,
  });

  useEffect(() => {
    const unsub = subscribeMonthlyVisitors(setVisitorStats);
    return () => unsub();
  }, []);

  // Create/revoke object URL for local image preview
  useEffect(() => {
    if (!imageFile) return;
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

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
        const info = diagnoseError(err, "ar");
        setFormNotice({ type: "error", ...info });
        toast.error(info.title, info.detail);
        setLoadingProjects(false);
      }
    );
  }, [isAdmin, toast]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setTags("Python, ASCII, CLI");
    setRawNotes("");
    setInstaUrl("");
    setDescAr("");
    setDescEn("");
    setFeatured(false);
    setImageFile(null);
    setImagePreviewUrl("");
    setZipFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (zipInputRef.current) zipInputRef.current.value = "";
  }, []);

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
        toast.success("تم إنشاء حساب المشرف بنجاح");
      } else {
        await loginWithEmail(email, password);
        toast.success("تم تسجيل الدخول");
      }
    } catch (err) {
      const info = diagnoseError(err, "ar");
      setAuthDiagnostic(info);
      toast.error(info.title, info.detail);
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
      toast.success("تم تفعيل صلاحيات المشرف");
    } catch (err) {
      const info = diagnoseError(err, "ar");
      setAuthDiagnostic(info);
      toast.error(info.title, info.detail);
    } finally {
      setUpgradingRole(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!rawNotes.trim()) {
      const msg = {
        title: "الوصف البسيط مطلوب",
        detail:
          "اكتب فكرة المشروع أو الوصف البسيط أولاً ليتمكن الذكاء الاصطناعي من صياغته.",
      };
      setFormNotice({ type: "error", ...msg });
      toast.warning(msg.title, msg.detail);
      return;
    }

    setAiLoading(true);
    setFormNotice(null);
    try {
      const res = await generateBilingualDescription({
        rawNotes,
        tags,
        title,
        tone: aiTone,
      });
      setDescAr(res.ar);
      setDescEn(res.en);
      const okMsg = {
        title: "تم توليد الوصف بنجاح",
        detail:
          res.via === "server"
            ? `تمت الصياغة عبر خادم الموقع (${res.model}). يمكنك مراجعتها قبل النشر.`
            : `تمت الصياغة عبر (${res.model}). يمكنك مراجعة النصين قبل النشر.`,
      };
      setFormNotice({ type: "success", ...okMsg });
      toast.success(okMsg.title, okMsg.detail);
    } catch (err) {
      const info = diagnoseError(err, "ar");
      setFormNotice({ type: "error", ...info });
      toast.error(info.title, info.detail);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLocalPolish = () => {
    if (!rawNotes.trim()) {
      toast.warning(
        "الوصف البسيط مطلوب",
        "اكتب فكرة المشروع أولاً ليتم تنسيقها تلقائياً."
      );
      return;
    }
    const res = generateLocalFallbackDescription({ rawNotes, tags, title });
    setDescAr(res.ar);
    setDescEn(res.en);
    const msg = {
      title: "تمت الصياغة الذكية المحلية",
      detail: "تم تنسيق الوصف بالعربية والإنكليزية محلياً بدون الحاجة لاتصال API.",
    };
    setFormNotice({ type: "success", ...msg });
    toast.success(msg.title, msg.detail);
  };

  const handleStartEdit = (project) => {
    setEditingId(project.id);
    setTitle(project.title || "");
    setTags((project.tags || []).join(", "));
    setInstaUrl(project.instaUrl || "");
    setDescAr(project.description_ar || "");
    setDescEn(project.description_en || "");
    setFeatured(Boolean(project.featured));
    setImageFile(null);
    setZipFile(null);
    setImagePreviewUrl(project.imageUrl || "");
    setFormNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("وضع تعديل المشروع", project.title);
  };

  const handlePublish = async (e) => {
    e.preventDefault();

    if (!editingId && !isSupabaseConfigured) {
      const info = diagnoseError({ code: "supabase-missing-env" }, "ar");
      setFormNotice({ type: "error", ...info });
      toast.error(info.title, info.detail);
      return;
    }

    if (!editingId && (!imageFile || !zipFile)) {
      const msg = {
        title: "ملفات ناقصة",
        detail: "يرجى إرفاق الصورة التوضيحية وملف الكود المضغوط (.zip) معاً.",
      };
      setFormNotice({ type: "error", ...msg });
      toast.warning(msg.title, msg.detail);
      return;
    }

    if (imageFile && imageFile.size > MAX_SUPABASE_BYTES) {
      toast.error("حجم الصورة كبير جداً", "الحد الأقصى للملف الواحد هو 50MB.");
      return;
    }

    if (zipFile && zipFile.size > MAX_SUPABASE_BYTES) {
      toast.error("حجم ملف ZIP كبير جداً", "الحد الأقصى للملف الواحد هو 50MB.");
      return;
    }

    let normalizedInsta = instaUrl.trim();
    if (normalizedInsta && !/^https?:\/\//i.test(normalizedInsta)) {
      normalizedInsta = `https://${normalizedInsta}`;
    }

    setFormNotice(null);
    try {
      const existingProject = editingId
        ? projects.find((p) => p.id === editingId)
        : null;

      let imageUrl = existingProject?.imageUrl || "";
      let zipUrl = existingProject?.zipUrl || "";

      if (imageFile) {
        setPublishingStep("image");
        imageUrl = await uploadToSupabase("previews", imageFile);
      }

      if (zipFile) {
        setPublishingStep("zip");
        zipUrl = await uploadToSupabase("zips", zipFile);
      }

      setPublishingStep("saving");
      const payload = {
        title: title.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        description_ar: descAr.trim(),
        description_en: descEn.trim(),
        instaUrl: normalizedInsta,
        imageUrl,
        zipUrl,
        featured,
      };

      if (editingId) {
        await withTimeout(
          updateDoc(doc(db, "projects", editingId), {
            ...payload,
            updatedAt: serverTimestamp(),
          }),
          10000
        );
        const msg = {
          title: "تم تحديث المشروع بنجاح",
          detail: "تم حفظ التعديلات وتحديث المشروع في الواجهة الرئيسية.",
        };
        setFormNotice({ type: "success", ...msg });
        toast.success(msg.title, msg.detail);
      } else {
        await withTimeout(
          addDoc(collection(db, "projects"), {
            ...payload,
            downloads: 0,
            createdAt: serverTimestamp(),
          }),
          10000
        );
        const msg = {
          title: "تم نشر المشروع بنجاح",
          detail: "تم رفع الملفات إلى Supabase Storage ونشر المشروع في الواجهة الرئيسية.",
        };
        setFormNotice({ type: "success", ...msg });
        toast.success(msg.title, msg.detail);
      }

      resetForm();
    } catch (err) {
      const info = diagnoseError(err, "ar");
      setFormNotice({ type: "error", ...info });
      toast.error(info.title, info.detail);
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
      toast.success(
        !project.featured ? "تم تمييز المشروع" : "تم إلغاء التمييز",
        project.title
      );
    } catch (err) {
      const info = diagnoseError(err, "ar");
      setFormNotice({ type: "error", ...info });
      toast.error(info.title, info.detail);
    } finally {
      setBusyProjectId("");
    }
  };

  const handleDeleteProject = async (project) => {
    if (confirmDeleteId !== project.id) {
      setConfirmDeleteId(project.id);
      toast.warning("تأكيد الحذف", `اضغط زر الحذف مرة أخرى لحذف "${project.title}"`);
      setTimeout(() => {
        setConfirmDeleteId((curr) => (curr === project.id ? "" : curr));
      }, 4500);
      return;
    }

    setBusyProjectId(project.id);
    setConfirmDeleteId("");
    try {
      await deleteDoc(doc(db, "projects", project.id));
      if (editingId === project.id) resetForm();
      toast.success("تم حذف المشروع", project.title);
    } catch (err) {
      const info = diagnoseError(err, "ar");
      setFormNotice({ type: "error", ...info });
      toast.error(info.title, info.detail);
    } finally {
      setBusyProjectId("");
    }
  };

  const getPublishLabel = () => {
    if (publishingStep === "image") return "1/3 جاري رفع الصورة...";
    if (publishingStep === "zip") return "2/3 جاري رفع ملف الـ ZIP...";
    if (publishingStep === "saving") return "3/3 جاري الحفظ...";
    return editingId ? "حفظ التعديلات" : "نشر المشروع";
  };

  const totalDownloads = useMemo(
    () => projects.reduce((sum, p) => sum + (Number(p.downloads) || 0), 0),
    [projects]
  );
  const featuredCount = useMemo(
    () => projects.filter((p) => p.featured).length,
    [projects]
  );
  const monthLabel = useMemo(
    () => (visitorStats.monthKey ? formatMonthLabel(visitorStats.monthKey, "ar") : ""),
    [visitorStats.monthKey]
  );
  const daysLeft = useMemo(() => getDaysRemainingInMonth(), []);

  if (checkingAuth) {
    return (
      <div
        className="min-h-dvh bg-[#0A0A0B] studio-grid text-[#F5F3EE] flex flex-col items-center justify-center gap-3 p-4"
        dir="rtl"
      >
        <Loader2 className="w-6 h-6 text-[#E85D2A] animate-spin" />
        <p className="text-xs text-[#9B9A97]">{checkStatusText}</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div
        className="min-h-dvh bg-[#0A0A0B] studio-grid text-[#F5F3EE] flex items-center justify-center p-4"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: STUDIO_EASE }}
          className="w-full max-w-sm rounded-3xl bg-[#111113] border border-white/10 p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#E85D2A]/40 flex items-center justify-center">
                <Lock className="w-4 h-4 text-[#E85D2A]" />
              </div>
              <div>
                <h1 className="font-bold text-base text-[#F5F3EE]">إدارة المحتوى</h1>
                <p className="text-[11px] text-[#8A8780] font-mono">codewhiz.1</p>
              </div>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => verifyUserRole(user)}
                title="إعادة فحص الصلاحيات"
                className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[#9B9A97] hover:text-[#F5F3EE] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {user && !isAdmin ? (
            <form onSubmit={handleUpgradeCurrentUser} className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.07] space-y-1">
                <p className="text-xs font-semibold text-[#F5F3EE]">
                  أنت مسجّل الدخول حالياً بـ:
                </p>
                <p className="text-[11px] font-mono text-[#F59E6C] truncate">
                  {user.email}
                </p>
                <p className="text-[11px] text-[#9B9A97] leading-relaxed pt-1">
                  هذا الحساب لا يملك سجل مشرف في Firestore بعد. أدخل رمز الأمان لتفعيل صلاحياتك فوراً:
                </p>
              </div>

              <input
                type="text"
                required
                placeholder="اسم المستخدم (Username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-black/50 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs font-mono"
              />

              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-[#787671] absolute top-3.5 start-3.5" />
                <input
                  type="password"
                  required
                  placeholder="رمز الأمان الإداري"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  className="w-full h-11 ps-9 pe-3.5 rounded-xl bg-black/50 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs font-mono"
                />
              </div>

              {authDiagnostic && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{authDiagnostic.title}</span>
                  </div>
                  <p className="text-[11px] text-rose-300/90 leading-relaxed">
                    {authDiagnostic.detail}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={upgradingRole}
                className="w-full h-11 rounded-xl bg-[#E85D2A] hover:bg-[#F06835] text-[#0A0A0B] font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {upgradingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {upgradingRole ? "جاري تفعيل الصلاحيات..." : "تفعيل صلاحية المشرف"}
                </span>
              </button>

              <button
                type="button"
                onClick={logoutUser}
                className="w-full h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#9B9A97] text-xs flex items-center justify-center gap-1.5 transition-colors"
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
                    className="w-full h-11 px-3.5 rounded-xl bg-black/50 border border-white/[0.08] text-xs font-mono disabled:opacity-50"
                  />
                  <input
                    type="password"
                    required
                    disabled={authSubmitting}
                    placeholder="رمز الأمان الإداري"
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-black/50 border border-white/[0.08] text-xs font-mono disabled:opacity-50"
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
                className="w-full h-11 px-3.5 rounded-xl bg-black/50 border border-white/[0.08] text-xs disabled:opacity-50"
              />
              <input
                type="password"
                required
                disabled={authSubmitting}
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-black/50 border border-white/[0.08] text-xs disabled:opacity-50"
              />

              {authDiagnostic && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{authDiagnostic.title}</span>
                  </div>
                  <p className="text-[11px] text-rose-300/90 leading-relaxed">
                    {authDiagnostic.detail}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full h-11 rounded-xl bg-[#F5F3EE] hover:bg-white text-[#0A0A0B] font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
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

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#9B9A97]">
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  setAuthDiagnostic(null);
                  setAuthMode(authMode === "login" ? "register" : "login");
                }}
                className="hover:text-[#F5F3EE] transition-colors"
              >
                {authMode === "login" ? "إنشاء حساب مشرف" : "تسجيل الدخول"}
              </button>
            ) : (
              <span className="text-[11px] font-mono text-[#787671]">
                uid: {user.uid.slice(0, 6)}...
              </span>
            )}
            <Link to="/" className="hover:text-[#F5F3EE] flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> الواجهة الرئيسية
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const isPublishing = Boolean(publishingStep);

  return (
    <div className="min-h-dvh bg-[#0A0A0B] studio-grid text-[#F5F3EE] flex flex-col" dir="rtl">
      <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 border-b border-white/[0.08] bg-[#111113]/90 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#E85D2A] shrink-0" />
          <span className="font-mono font-semibold text-sm text-[#F5F3EE] truncate">
            codewhiz.1
          </span>
          <span className="text-[#5A5854]">/</span>
          <span className="text-xs text-[#9B9A97] truncate">لوحة الإدارة</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/"
            className="h-9 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-[#D6D3CD] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>معاينة الموقع</span>
          </Link>
          <button
            type="button"
            onClick={logoutUser}
            title="تسجيل الخروج"
            className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[#9B9A97] hover:text-[#F5F3EE] flex items-center justify-center transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-12">
        {/* Admin Live Analytics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08]">
            <div className="flex items-center justify-between text-[11px] text-[#8A8780]">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                زوار الشهر ({monthLabel.split(" ")[0]})
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-2xl font-mono font-bold text-[#F5F3EE] tabular-nums mt-1.5">
              {visitorStats.loading ? "..." : visitorStats.count.toLocaleString()}
            </p>
            <p className="text-[10px] font-mono text-[#787671] mt-0.5">
              يتصفر تلقائياً بعد {daysLeft} يوم
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08]">
            <span className="text-[11px] text-[#8A8780] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#E85D2A]" />
              إجمالي المشاريع
            </span>
            <p className="text-2xl font-mono font-bold text-[#F5F3EE] tabular-nums mt-1.5">
              {loadingProjects ? "..." : projects.length}
            </p>
            <p className="text-[10px] font-mono text-[#787671] mt-0.5">
              منشور في الأرشيف
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08]">
            <span className="text-[11px] text-[#8A8780] flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              المختارات
            </span>
            <p className="text-2xl font-mono font-bold text-[#F5F3EE] tabular-nums mt-1.5">
              {loadingProjects ? "..." : featuredCount}
            </p>
            <p className="text-[10px] font-mono text-[#787671] mt-0.5">
              مشاريع مميزة
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08]">
            <span className="text-[11px] text-[#8A8780] flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-[#E85D2A]" />
              إجمالي التحميلات
            </span>
            <p className="text-2xl font-mono font-bold text-[#F5F3EE] tabular-nums mt-1.5">
              {loadingProjects ? "..." : totalDownloads.toLocaleString()}
            </p>
            <p className="text-[10px] font-mono text-[#787671] mt-0.5">
              ملفات ZIP محمّلة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Publish / Edit Project Form */}
          <form
            onSubmit={handlePublish}
            className="lg:col-span-7 rounded-3xl bg-[#111113] border border-white/[0.08] p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-[#F5F3EE]">
                  {editingId ? "تعديل مشروع منشور" : "إضافة مشروع جديد"}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-[#D6D3CD] flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> إلغاء التعديل
                  </button>
                )}
              </div>
              <span className="text-[11px] font-mono text-[#787671]">
                Supabase Storage
              </span>
            </div>

            {!isSupabaseConfigured && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  مفاتيح <b>VITE_SUPABASE_URL</b> و <b>VITE_SUPABASE_ANON_KEY</b> غير
                  مضافة في ملف <code>.env</code> بعد.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                disabled={isPublishing}
                placeholder="عنوان المشروع"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 px-3.5 rounded-xl bg-black/50 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs disabled:opacity-50"
              />
              <input
                type="text"
                disabled={isPublishing}
                placeholder="التقنيات (Python, ASCII, React)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="h-11 px-3.5 rounded-xl bg-black/50 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs font-mono disabled:opacity-50"
              />
            </div>

            <div className="relative">
              <Instagram className="w-4 h-4 text-[#787671] absolute top-3.5 start-3.5" />
              <input
                type="text"
                disabled={isPublishing}
                placeholder="رابط فيديو الريلز على إنستغرام (اختياري)"
                value={instaUrl}
                onChange={(e) => setInstaUrl(e.target.value)}
                className="w-full h-11 ps-10 pe-3.5 rounded-xl bg-black/50 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs font-mono disabled:opacity-50"
              />
            </div>

            {/* Upgraded Bilingual AI Description Studio */}
            <div className="p-4 rounded-2xl bg-black/45 border border-white/[0.08] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-[#F5F3EE] block">
                    صياغة الوصف بالذكاء الاصطناعي (عربي + إنكليزي)
                  </span>
                  <span className="text-[10px] text-[#8A8780]">
                    يمر تلقائياً عبر خادم Vercel لتجاوز الحظر الجغرافي، مع بديل محلي فوري.
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    disabled={aiLoading || isPublishing}
                    className="h-9 px-2.5 rounded-lg bg-[#18181B] border border-white/10 text-[11px] text-[#D6D3CD] outline-none"
                  >
                    <option value="technical">أسلوب تقني احترافي</option>
                    <option value="concise">مختصر جداً (جملة واحدة)</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={aiLoading || isPublishing}
                    className="h-9 px-3.5 rounded-lg bg-[#E85D2A] hover:bg-[#F06835] text-[#0A0A0B] font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                    <span>{aiLoading ? "جاري التوليد..." : "توليد بالـ AI"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLocalPolish}
                    disabled={aiLoading || isPublishing}
                    title="صياغة فورية بدون إنترنت أو API"
                    className="h-9 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[#D6D3CD] text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#E85D2A]" />
                    <span>صياغة محلية</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                disabled={aiLoading || isPublishing}
                placeholder="اكتب هنا شرحاً بسيطاً لما يفعله الكود ليقوم الذكاء الاصطناعي بصياغته بالعربي والإنكليزي..."
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#111113] border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs leading-relaxed disabled:opacity-50"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <textarea
                  rows={3}
                  required
                  disabled={aiLoading || isPublishing}
                  placeholder="الوصف النهائي بالعربي..."
                  value={descAr}
                  onChange={(e) => setDescAr(e.target.value)}
                  className="p-3 rounded-xl bg-[#111113] border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs leading-relaxed disabled:opacity-50"
                />
                <textarea
                  rows={3}
                  required
                  dir="ltr"
                  disabled={aiLoading || isPublishing}
                  placeholder="Final English description..."
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  className="p-3 rounded-xl bg-[#111113] border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs leading-relaxed disabled:opacity-50"
                />
              </div>
            </div>

            {/* File Pickers with Preview & Size Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="min-h-[92px] p-3 rounded-2xl border border-dashed border-white/15 hover:border-[#E85D2A]/60 bg-black/35 flex items-center justify-center cursor-pointer text-xs text-[#9B9A97] gap-3 transition-colors">
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-[#D6D3CD] shrink-0" />
                )}
                <div className="min-w-0 text-start">
                  <p className="truncate font-medium text-[#F5F3EE]">
                    {imageFile
                      ? imageFile.name
                      : editingId
                      ? "تغيير الصورة (اختياري)"
                      : "إرفاق صورة توضيحية"}
                  </p>
                  <p className="text-[10px] font-mono text-[#787671] mt-0.5">
                    {imageFile ? formatMB(imageFile.size) : "PNG, JPG, WebP"}
                  </p>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  disabled={isPublishing}
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>

              <label className="min-h-[92px] p-3 rounded-2xl border border-dashed border-white/15 hover:border-[#E85D2A]/60 bg-black/35 flex items-center justify-center cursor-pointer text-xs text-[#9B9A97] gap-3 transition-colors">
                <FileArchive className="w-5 h-5 text-[#E85D2A] shrink-0" />
                <div className="min-w-0 text-start">
                  <p className="truncate font-medium text-[#F5F3EE]">
                    {zipFile
                      ? zipFile.name
                      : editingId
                      ? "تغيير ملف ZIP (اختياري)"
                      : "إرفاق ملف الكود (.ZIP)"}
                  </p>
                  <p className="text-[10px] font-mono text-[#787671] mt-0.5">
                    {zipFile ? formatMB(zipFile.size) : "حتى 50MB"}
                  </p>
                </div>
                <input
                  ref={zipInputRef}
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
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-200"
                    : "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {formNotice.type === "error" ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span>{formNotice.title}</span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {formNotice.detail}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-[#D6D3CD] cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  disabled={isPublishing}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-black/50 accent-[#E85D2A]"
                />
                <span>تمييز المشروع في تبويب المختارات</span>
              </label>

              <button
                type="submit"
                disabled={isPublishing}
                className="px-6 h-11 rounded-xl bg-[#F5F3EE] hover:bg-white text-[#0A0A0B] font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{getPublishLabel()}</span>
              </button>
            </div>
          </form>

          {/* Published Projects Manager */}
          <div className="lg:col-span-5 rounded-3xl bg-[#111113] border border-white/[0.08] p-5 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm sm:text-base text-[#F5F3EE]">
                المشاريع المنشورة
              </h2>
              <span className="text-xs font-mono text-[#787671] tabular-nums">
                {loadingProjects ? "..." : projects.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[68vh] overflow-y-auto vault-scroll pe-1">
              {loadingProjects ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#8A8780]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#E85D2A]" />
                  <span className="text-xs">جاري تحميل المشاريع...</span>
                </div>
              ) : projects.length === 0 ? (
                <p className="text-xs text-[#787671] py-10 text-center">
                  لم يتم نشر أي مشروع بعد
                </p>
              ) : (
                projects.map((p) => {
                  const isItemBusy = busyProjectId === p.id;
                  const isConfirmingDelete = confirmDeleteId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                        editingId === p.id
                          ? "bg-[#E85D2A]/10 border-[#E85D2A]/40"
                          : "bg-black/45 border-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 bg-[#18181B]"
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-[#F5F3EE] truncate">
                            {p.title}
                          </h4>
                          <p className="text-[11px] text-[#8A8780] font-mono truncate mt-0.5">
                            {(p.tags || []).join(" · ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(p)}
                          disabled={isItemBusy}
                          title="تعديل"
                          className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-[#D6D3CD] flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(p)}
                          disabled={isItemBusy}
                          title="تمييز"
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-50 ${
                            p.featured
                              ? "bg-[#E85D2A]/15 border-[#E85D2A]/45 text-[#E85D2A]"
                              : "bg-white/[0.04] border-white/[0.08] text-[#8A8780] hover:text-[#F5F3EE]"
                          }`}
                        >
                          {isItemBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Star className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(p)}
                          disabled={isItemBusy}
                          title={isConfirmingDelete ? "اضغط مجدداً لتأكيد الحذف" : "حذف"}
                          className={`h-9 px-2.5 rounded-xl border flex items-center justify-center gap-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                            isConfirmingDelete
                              ? "bg-rose-500 border-rose-400 text-white"
                              : "bg-white/[0.04] hover:bg-rose-500/15 border-white/[0.08] hover:border-rose-500/35 text-[#8A8780] hover:text-rose-400"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {isConfirmingDelete && <span>تأكيد</span>}
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
    </div>
  );
}
