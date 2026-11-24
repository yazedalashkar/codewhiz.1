import { motion } from "framer-motion";
import {
  FolderCode,
  Bookmark,
  Info,
  Globe,
  User,
  LogIn,
  Loader2,
} from "lucide-react";

const STUDIO_EASE = [0.22, 1, 0.36, 1];

export default function Navbar({
  activeTab,
  setActiveTab,
  lang,
  setLang,
  userProfile,
  authLoading,
  onOpenAuth,
  totalCount,
  isLoadingProjects,
}) {
  const navItems = [
    { id: "projects", labelAr: "المشاريع", labelEn: "Projects", icon: FolderCode },
    { id: "featured", labelAr: "المختارات", labelEn: "Selected", icon: Bookmark },
    { id: "about", labelAr: "حول", labelEn: "About", icon: Info },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: STUDIO_EASE }}
        className="w-full z-30 px-4 md:px-8 pt-3 shrink-0"
      >
        <div className="max-w-7xl mx-auto h-14 rounded-2xl bg-[#111114]/90 backdrop-blur-md border border-zinc-800/90 px-4 md:px-5 flex items-center justify-between">
          {/* Brand Identity */}
          <button
            onClick={() => setActiveTab("projects")}
            className="flex items-center gap-3 text-start group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center font-mono text-xs font-semibold text-zinc-100 group-hover:border-zinc-500 transition-colors">
              cw
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-sm md:text-[15px] tracking-tight text-zinc-100">
                codewhiz.1
              </span>
              {isLoadingProjects ? (
                <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />
              ) : (
                <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-500 tabular-nums">
                  /{totalCount}
                </span>
              )}
            </div>
          </button>

          {/* Desktop Segmented Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-950/90 p-1 rounded-xl border border-zinc-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                    isActive ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktopActiveTab"
                      transition={{ duration: 0.32, ease: STUDIO_EASE }}
                      className="absolute inset-0 rounded-lg bg-zinc-800/90 border border-zinc-700/70"
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">
                    {lang === "ar" ? item.labelAr : item.labelEn}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Actions: Language & Account */}
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="h-8 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-medium text-zinc-300 flex items-center gap-1.5 transition-colors"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span>{lang === "ar" ? "EN" : "عربي"}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onOpenAuth}
              disabled={authLoading}
              className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                userProfile
                  ? "bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-mono"
                  : "bg-zinc-100 hover:bg-white text-zinc-950 font-semibold"
              }`}
            >
              {authLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
              ) : userProfile ? (
                <>
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>@{userProfile.username}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "دخول" : "Sign in"}</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-10 inset-x-4 z-30">
        <div className="bg-[#111114]/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-1 flex items-center justify-between shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex-1 py-2 rounded-xl flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? "text-zinc-100" : "text-zinc-500"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    transition={{ duration: 0.3, ease: STUDIO_EASE }}
                    className="absolute inset-0 rounded-xl bg-zinc-800/90 border border-zinc-700/70"
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">
                  {lang === "ar" ? item.labelAr : item.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
