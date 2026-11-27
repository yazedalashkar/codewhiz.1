import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  X,
  Mail,
  Lock,
  User,
  LogOut,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
} from "../lib/firebase";
import { diagnoseError } from "../lib/diagnostics";
import { useToast } from "./ToastProvider";

const STUDIO_EASE = [0.22, 1, 0.36, 1];

export default function AuthModal({ isOpen, onClose, lang, userProfile }) {
  const toast = useToast();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [diagnostic, setDiagnostic] = useState(null);

  const isBusy = Boolean(loadingAction);

  useEffect(() => {
    if (!isOpen) {
      setDiagnostic(null);
      return;
    }
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDiagnostic(null);
    setLoadingAction("email");
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
        toast.success(
          lang === "ar" ? "تم تسجيل الدخول بنجاح" : "Signed in successfully"
        );
      } else {
        await registerWithEmail({ email, password, username });
        toast.success(
          lang === "ar" ? "تم إنشاء الحساب بنجاح" : "Account created successfully"
        );
      }
      setPassword("");
      onClose();
    } catch (err) {
      const info = diagnoseError(err, lang);
      setDiagnostic(info);
      toast.error(info.title, info.detail);
    } finally {
      setLoadingAction("");
    }
  };

  const handleGoogle = async () => {
    setDiagnostic(null);
    setLoadingAction("google");
    try {
      await loginWithGoogle();
      toast.success(
        lang === "ar" ? "تم تسجيل الدخول عبر Google" : "Signed in with Google"
      );
      onClose();
    } catch (err) {
      const info = diagnoseError(err, lang);
      setDiagnostic(info);
      toast.error(info.title, info.detail);
    } finally {
      setLoadingAction("");
    }
  };

  const handleLogout = async () => {
    setLoadingAction("logout");
    try {
      await logoutUser();
      toast.info(lang === "ar" ? "تم تسجيل الخروج" : "Signed out");
      onClose();
    } finally {
      setLoadingAction("");
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.3, ease: STUDIO_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#111113] border-t sm:border border-white/10 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_28px_80px_-15px_rgba(0,0,0,0.9)] relative max-h-[90dvh] overflow-y-auto vault-scroll"
          >
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 end-4 w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-[#A8A59E] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {userProfile ? (
              <div className="text-center space-y-4 py-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#18181B] border border-[#E85D2A]/40 flex items-center justify-center font-mono font-bold text-xl text-[#F5F3EE]">
                  {userProfile.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="text-base font-semibold font-mono text-[#F5F3EE]">
                    @{userProfile.username}
                  </h3>
                  <p className="text-xs text-[#8A8780] font-mono mt-0.5">
                    {userProfile.email}
                  </p>
                </div>

                {userProfile.role === "admin" && (
                  <Link
                    to="/vault-admin"
                    onClick={onClose}
                    className="w-full h-10 rounded-xl bg-[#E85D2A]/15 hover:bg-[#E85D2A]/25 border border-[#E85D2A]/35 text-[#F59E6C] font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {lang === "ar" ? "فتح لوحة الإدارة" : "Open Admin Vault"}
                    </span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isBusy}
                  className="w-full h-11 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 text-rose-300 font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loadingAction === "logout" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {loadingAction === "logout"
                      ? lang === "ar"
                        ? "جاري تسجيل الخروج..."
                        : "Signing out..."
                      : lang === "ar"
                      ? "تسجيل الخروج"
                      : "Sign out"}
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-[#F5F3EE]">
                    {mode === "login"
                      ? lang === "ar"
                        ? "تسجيل الدخول"
                        : "Sign in"
                      : lang === "ar"
                      ? "إنشاء حساب جديد"
                      : "Create account"}
                  </h2>
                  <p className="text-xs text-[#9B9A97] mt-1">
                    {lang === "ar"
                      ? "سجّل دخولك للوصول السريع إلى أرشيف المشاريع"
                      : "Access @codewhiz.1 source archives"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={isBusy}
                  className="w-full h-11 rounded-xl bg-[#F5F3EE] hover:bg-white text-[#0A0A0B] font-semibold text-xs flex items-center justify-center gap-2 mb-4 transition-colors disabled:opacity-60"
                >
                  {loadingAction === "google" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-700" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.05 21.2 7.24 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.02 14.03c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.17H1.01C.37 7.45 0 8.88 0 10.37s.37 2.92 1.01 4.2l4.01-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.79 0 3.41.62 4.68 1.82l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.05 2.8 1.01 6.83l4.01 3.14c.98-2.95 3.73-5.22 6.98-5.22Z"
                      />
                    </svg>
                  )}
                  <span>
                    {loadingAction === "google"
                      ? lang === "ar"
                        ? "جاري الربط مع Google..."
                        : "Connecting Google..."
                      : lang === "ar"
                      ? "المتابعة باستخدام Google"
                      : "Continue with Google"}
                  </span>
                </button>

                <div className="relative flex py-1.5 items-center mb-4">
                  <div className="flex-grow border-t border-white/[0.08]" />
                  <span className="flex-shrink mx-3 text-[10px] text-[#787671] font-mono uppercase">
                    {lang === "ar" ? "أو بالبريد" : "or email"}
                  </span>
                  <div className="flex-grow border-t border-white/[0.08]" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {mode === "register" && (
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-[#787671] absolute top-3.5 start-3.5" />
                      <input
                        type="text"
                        required
                        disabled={isBusy}
                        placeholder={
                          lang === "ar" ? "اسم المستخدم (Username)" : "Username"
                        }
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full h-11 ps-9 pe-3 rounded-xl bg-black/50 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs font-mono text-[#F5F3EE] disabled:opacity-50"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#787671] absolute top-3.5 start-3.5" />
                    <input
                      type="email"
                      required
                      disabled={isBusy}
                      placeholder={
                        lang === "ar" ? "البريد الإلكتروني" : "Email address"
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 ps-9 pe-3 rounded-xl bg-black/50 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs text-[#F5F3EE] disabled:opacity-50"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#787671] absolute top-3.5 start-3.5" />
                    <input
                      type="password"
                      required
                      disabled={isBusy}
                      minLength={6}
                      placeholder={lang === "ar" ? "كلمة المرور" : "Password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 ps-9 pe-3 rounded-xl bg-black/50 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs text-[#F5F3EE] disabled:opacity-50"
                    />
                  </div>

                  {diagnostic && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{diagnostic.title}</span>
                      </div>
                      <p className="text-[11px] text-rose-300/90 leading-relaxed">
                        {diagnostic.detail}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="w-full h-11 rounded-xl bg-[#E85D2A] hover:bg-[#F06835] text-[#0A0A0B] font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loadingAction === "email" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>
                      {loadingAction === "email"
                        ? lang === "ar"
                          ? "جاري المعالجة..."
                          : "Please wait..."
                        : mode === "login"
                        ? lang === "ar"
                          ? "دخول"
                          : "Sign in"
                        : lang === "ar"
                        ? "إنشاء الحساب"
                        : "Create account"}
                    </span>
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setDiagnostic(null);
                    setMode(mode === "login" ? "register" : "login");
                  }}
                  disabled={isBusy}
                  className="w-full mt-4 text-xs text-[#9B9A97] hover:text-[#F5F3EE] transition-colors text-center"
                >
                  {mode === "login"
                    ? lang === "ar"
                      ? "ليس لديك حساب؟ أنشئ حساباً جديداً"
                      : "No account yet? Register"
                    : lang === "ar"
                    ? "لديك حساب بالفعل؟ سجّل الدخول"
                    : "Already registered? Sign in"}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
