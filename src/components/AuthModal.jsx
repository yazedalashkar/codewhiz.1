import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, LogOut, Loader2, AlertCircle } from "lucide-react";
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
} from "../lib/firebase";
import { diagnoseError } from "../lib/diagnostics";

const STUDIO_EASE = [0.22, 1, 0.36, 1];

export default function AuthModal({ isOpen, onClose, lang, userProfile }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [diagnostic, setDiagnostic] = useState(null);

  const isBusy = Boolean(loadingAction);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDiagnostic(null);
    setLoadingAction("email");
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail({ email, password, username });
      }
      onClose();
    } catch (err) {
      setDiagnostic(diagnoseError(err, lang));
    } finally {
      setLoadingAction("");
    }
  };

  const handleGoogle = async () => {
    setDiagnostic(null);
    setLoadingAction("google");
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      setDiagnostic(diagnoseError(err, lang));
    } finally {
      setLoadingAction("");
    }
  };

  const handleLogout = async () => {
    setLoadingAction("logout");
    try {
      await logoutUser();
      onClose();
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: STUDIO_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#111114] border border-zinc-800 p-6 shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 end-4 w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {userProfile ? (
              <div className="text-center space-y-4 py-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xl text-zinc-100">
                  {userProfile.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-semibold font-mono text-zinc-100">
                    @{userProfile.username}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    {userProfile.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isBusy}
                  className="w-full h-10 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-red-300 font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
                  <h2 className="text-lg font-bold text-zinc-100">
                    {mode === "login"
                      ? lang === "ar"
                        ? "تسجيل الدخول"
                        : "Sign in"
                      : lang === "ar"
                      ? "إنشاء حساب جديد"
                      : "Create account"}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    {lang === "ar"
                      ? "سجّل دخولك للوصول السريع إلى أرشيف المشاريع"
                      : "Access @codewhiz.1 source archives"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={isBusy}
                  className="w-full h-10 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 mb-4 transition-colors disabled:opacity-60"
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
                  <div className="flex-grow border-t border-zinc-800" />
                  <span className="flex-shrink mx-3 text-[10px] text-zinc-500 font-mono uppercase">
                    {lang === "ar" ? "أو بالبريد" : "or email"}
                  </span>
                  <div className="flex-grow border-t border-zinc-800" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {mode === "register" && (
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-zinc-500 absolute top-3.5 start-3.5" />
                      <input
                        type="text"
                        required
                        disabled={isBusy}
                        placeholder={lang === "ar" ? "اسم المستخدم (Username)" : "Username"}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full h-10 ps-9 pe-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 outline-none text-xs font-mono text-zinc-100 disabled:opacity-50"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 absolute top-3.5 start-3.5" />
                    <input
                      type="email"
                      required
                      disabled={isBusy}
                      placeholder={lang === "ar" ? "البريد الإلكتروني" : "Email address"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 ps-9 pe-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 outline-none text-xs text-zinc-100 disabled:opacity-50"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-zinc-500 absolute top-3.5 start-3.5" />
                    <input
                      type="password"
                      required
                      disabled={isBusy}
                      minLength={6}
                      placeholder={lang === "ar" ? "كلمة المرور" : "Password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 ps-9 pe-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 outline-none text-xs text-zinc-100 disabled:opacity-50"
                    />
                  </div>

                  {diagnostic && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>{diagnostic.title}</span>
                      </div>
                      <p className="text-[11px] text-red-300/90 leading-relaxed">
                        {diagnostic.detail}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="w-full h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
                  onClick={() => {
                    setDiagnostic(null);
                    setMode(mode === "login" ? "register" : "login");
                  }}
                  disabled={isBusy}
                  className="w-full mt-4 text-xs text-zinc-400 hover:text-zinc-200 transition-colors text-center"
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
    </AnimatePresence>
  );
}
