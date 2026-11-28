import { useState } from "react";
import { Mail, Lock, User, LogOut, Loader2, AlertCircle } from "lucide-react";
import Sheet from "./Sheet";
import { loginWithGoogle, loginWithEmail, registerWithEmail, logoutUser } from "../lib/firebase";
import { diagnoseError } from "../lib/diagnostics";

const GoogleG = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
    <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.05 21.2 7.24 24 12 24Z" />
    <path fill="#FBBC05" d="M5.02 14.03c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.17H1.01C.37 7.45 0 8.88 0 10.37s.37 2.92 1.01 4.2l4.01-3.14Z" />
    <path fill="#EA4335" d="M12 4.75c1.79 0 3.41.62 4.68 1.82l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.05 2.8 1.01 6.83l4.01 3.14c.98-2.95 3.73-5.22 6.98-5.22Z" />
  </svg>
);

function Input({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 text-bone/40 absolute top-1/2 -translate-y-1/2 start-4 pointer-events-none" />
      <input {...props} className="field ps-11" />
    </div>
  );
}

export default function AuthModal({ isOpen, onClose, lang, userProfile }) {
  const ar = lang === "ar";
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState("");
  const [diag, setDiag] = useState(null);

  const run = async (kind, fn, closeAfter = true) => {
    setDiag(null);
    setBusy(kind);
    try {
      await fn();
      if (closeAfter) onClose();
    } catch (err) {
      setDiag(diagnoseError(err, lang));
    } finally {
      setBusy("");
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run("email", () => (mode === "login" ? loginWithEmail(email, password) : registerWithEmail({ email, password, username })));
  };

  return (
    <Sheet open={isOpen} onClose={onClose} maxWidth="max-w-sm" label="account">
      <div className="p-6 pt-4 md:pt-8">
        {userProfile ? (
          <div className="text-center space-y-5 py-2">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-flare text-ink font-display text-4xl flex items-center justify-center rotate-[-5deg]">
              {userProfile.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-display text-2xl">@{userProfile.username}</h3>
              <p className="text-sm text-bone/50 mt-1 break-all">{userProfile.email}</p>
            </div>
            <button
              onClick={() => run("logout", logoutUser)}
              disabled={Boolean(busy)}
              className="w-full h-12 rounded-2xl bg-ink text-bone font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === "logout" ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {ar ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-3xl">
              {mode === "login" ? (ar ? "أهلاً بعودتك" : "Welcome back") : ar ? "حساب جديد" : "New account"}
            </h2>
            <p className="text-sm text-bone/55 mt-1 mb-5">
              {ar ? "الحساب يتيح لك الوصول السريع إلى الأرشيف." : "An account gives you quick access to the archive."}
            </p>

            <button
              type="button"
              onClick={() => run("google", loginWithGoogle)}
              disabled={Boolean(busy)}
              className="w-full h-12 rounded-2xl bg-bone text-ink font-semibold text-sm flex items-center justify-center gap-2.5 disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {busy === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleG />}
              {ar ? "المتابعة مع Google" : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 my-5 text-xs text-bone/40">
              <span className="h-px flex-1 bg-haze" />
              {ar ? "أو بالبريد" : "or with email"}
              <span className="h-px flex-1 bg-haze" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "register" && (
                <Input icon={User} type="text" required autoCapitalize="none" dir="ltr" disabled={Boolean(busy)}
                  placeholder={ar ? "اسم المستخدم (إنكليزي)" : "Username"} value={username} onChange={(e) => setUsername(e.target.value)} />
              )}
              <Input icon={Mail} type="email" required dir="ltr" autoComplete="email" disabled={Boolean(busy)}
                placeholder={ar ? "البريد الإلكتروني" : "Email"} value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input icon={Lock} type="password" required minLength={6} dir="ltr" autoComplete={mode === "login" ? "current-password" : "new-password"} disabled={Boolean(busy)}
                placeholder={ar ? "كلمة المرور" : "Password"} value={password} onChange={(e) => setPassword(e.target.value)} />

              {diag && (
                <div role="alert" className="p-3 rounded-2xl bg-flare/15 border-2 border-flare/40 text-sm space-y-1">
                  <p className="font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4 text-flare shrink-0" />{diag.title}</p>
                  <p className="text-bone/75 leading-6">{diag.detail}</p>
                </div>
              )}

              <button type="submit" disabled={Boolean(busy)}
                className="w-full h-12 rounded-2xl bg-flare text-ink font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform">
                {busy === "email" && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "login" ? (ar ? "دخول" : "Sign in") : ar ? "إنشاء الحساب" : "Create account"}
              </button>
            </form>

            <button
              onClick={() => { setDiag(null); setMode(mode === "login" ? "register" : "login"); }}
              disabled={Boolean(busy)}
              className="w-full mt-4 h-11 text-sm text-bone/60 hover:text-bone"
            >
              {mode === "login" ? (ar ? "ليس لديك حساب؟ أنشئ واحداً" : "No account? Create one") : ar ? "لديك حساب؟ سجّل الدخول" : "Have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
