import { motion } from "framer-motion";
import { FolderCode, Bookmark, Info, Languages, User, LogIn, Loader2 } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

export default function Navbar({ activeTab, onNavigate, lang, setLang, userProfile, authLoading, onOpenAuth, totalCount, isLoadingProjects }) {
  const items = [
    { id: "projects", ar: "المشاريع", en: "Projects", icon: FolderCode },
    { id: "featured", ar: "المختارات", en: "Selected", icon: Bookmark },
    { id: "about", ar: "حول", en: "About", icon: Info },
  ];
  const t = (it) => (lang === "ar" ? it.ar : it.en);

  const account = (
    <button
      onClick={onOpenAuth}
      disabled={authLoading}
      className={`h-10 px-4 rounded-full text-sm font-medium flex items-center gap-2 active:scale-95 transition-transform ${
        userProfile ? "bg-haze text-bone" : "bg-sun text-ink font-semibold"
      }`}
    >
      {authLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : userProfile ? (
        <>
          <User className="w-4 h-4 text-flare" />
          <span className="max-w-[90px] truncate">{userProfile.username}</span>
        </>
      ) : (
        <>
          <LogIn className="w-4 h-4" />
          <span>{lang === "ar" ? "دخول" : "Sign in"}</span>
        </>
      )}
    </button>
  );

  return (
    <>
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="fixed top-0 inset-x-0 z-40 px-3 md:px-8 pt-[max(env(safe-area-inset-top),10px)]"
      >
        <div className="max-w-6xl mx-auto h-14 rounded-full bg-plum/90 backdrop-blur-md border-2 border-haze ps-5 pe-2 flex items-center justify-between">
          <button onClick={() => onNavigate("top")} className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-flare text-ink font-mono font-bold text-xs flex items-center justify-center rotate-[-6deg]">
              cw
            </span>
            <span className="font-display text-xl leading-none tracking-wide">codewhiz.1</span>
            {!isLoadingProjects && (
              <span className="hidden sm:inline text-xs text-bone/50 tabular-nums">{totalCount}</span>
            )}
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {items.map((it) => {
              const active = activeTab === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => onNavigate(it.id)}
                  className={`relative h-10 px-5 rounded-full text-sm font-medium transition-colors ${active ? "text-ink" : "text-bone/70 hover:text-bone"}`}
                >
                  {active && (
                    <motion.span layoutId="navPill" transition={{ duration: 0.35, ease: EASE }} className="absolute inset-0 rounded-full bg-bone" />
                  )}
                  <span className="relative">{t(it)}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              aria-label="Toggle language"
              className="h-10 w-10 md:w-auto md:px-3.5 rounded-full bg-ink/60 text-bone flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform"
            >
              <Languages className="w-4 h-4" />
              <span className="hidden md:inline">{lang === "ar" ? "EN" : "عربي"}</span>
            </button>
            {account}
          </div>
        </div>
      </motion.header>

      {/* Phone dock: thumb-reach navigation */}
      <nav className="md:hidden fixed inset-x-3 z-40 bottom-dock">
        <div className="h-16 rounded-[22px] bg-plum/95 backdrop-blur-md border-2 border-haze p-1.5 flex items-center gap-1">
          {items.map((it) => {
            const Icon = it.icon;
            const active = activeTab === it.id;
            return (
              <button
                key={it.id}
                onClick={() => onNavigate(it.id)}
                className={`relative flex-1 h-full rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${active ? "text-ink" : "text-bone/60"}`}
              >
                {active && (
                  <motion.span layoutId="dockPill" transition={{ duration: 0.35, ease: EASE }} className="absolute inset-0 rounded-2xl bg-sun" />
                )}
                <Icon className="w-5 h-5 relative" />
                <span className="relative">{t(it)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
