import { motion } from "framer-motion";
import {
  FolderCode,
  Star,
  Bookmark,
  Info,
  Globe,
  User,
  LogIn,
  Loader2,
  Search,
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
  onOpenCommand,
  totalCount,
  savedCount,
  isLoadingProjects,
}) {
  const navItems = [
    { id: "projects", labelAr: "الأرشيف", labelEn: "Archive", icon: FolderCode },
    { id: "featured", labelAr: "المختارات", labelEn: "Selected", icon: Star },
    {
      id: "saved",
      labelAr: "المحفوظات",
      labelEn: "Saved",
      icon: Bookmark,
      badge: savedCount > 0 ? savedCount : null,
    },
    { id: "about", labelAr: "الاستوديو", labelEn: "Studio", icon: Info },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: STUDIO_EASE }}
        className="sticky top-0 w-full z-40 px-3 sm:px-6 lg:px-8 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2"
      >
        <div className="max-w-7xl mx-auto h-14 rounded-2xl bg-[#111113]/85 backdrop-blur-xl border border-white/[0.08] px-3.5 sm:px-5 flex items-center justify-between shadow-[0_12px_36px_-18px_rgba(0,0,0,0.85)]">
          {/* Brand Signature */}
          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className="flex items-center gap-2.5 text-start group focus:outline-none min-w-0"
          >
            <div className="relative w-8 h-8 rounded-xl bg-[#18181B] border border-white/10 flex items-center justify-center font-mono text-[11px] font-bold text-[#F5F3EE] group-hover:border-[#E85D2A]/60 transition-colors shrink-0">
              <span>cw</span>
              <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-[#E85D2A]" />
            </div>
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-mono font-semibold text-sm tracking-tight text-[#F5F3EE] truncate">
                codewhiz.1
              </span>
              {isLoadingProjects ? (
                <Loader2 className="w-3 h-3 text-[#8A8780] animate-spin shrink-0" />
              ) : (
                <span className="hidden sm:inline-block text-[11px] font-mono text-[#787671] tabular-nums">
                  [{String(totalCount).padStart(2, "0")}]
                </span>
              )}
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                    isActive
                      ? "text-[#F5F3EE]"
                      : "text-[#8A8780] hover:text-[#F5F3EE]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktopActiveTab"
                      transition={{ duration: 0.32, ease: STUDIO_EASE }}
                      className="absolute inset-0 rounded-lg bg-[#1C1C20] border border-white/10"
                    />
                  )}
                  <Icon
                    className={`w-3.5 h-3.5 relative z-10 ${
                      isActive ? "text-[#E85D2A]" : ""
                    }`}
                  />
                  <span className="relative z-10">
                    {lang === "ar" ? item.labelAr : item.labelEn}
                  </span>
                  {item.badge && (
                    <span className="relative z-10 px-1.5 py-0.2 rounded-md bg-[#E85D2A]/20 text-[#F59E6C] text-[10px] font-mono tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Utility Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Command Palette Trigger */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onOpenCommand}
              aria-label={lang === "ar" ? "بحث سريع" : "Quick Search"}
              className="h-9 sm:h-8 px-2.5 rounded-xl sm:rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-[#A8A59E] hover:text-[#F5F3EE] flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#E85D2A]" />
              <span className="hidden lg:inline">⌘K</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="h-9 sm:h-8 px-2.5 rounded-xl sm:rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono font-medium text-[#D6D3CD] flex items-center gap-1.5 transition-colors"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#8A8780]" />
              <span>{lang === "ar" ? "EN" : "ع"}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onOpenAuth}
              disabled={authLoading}
              className={`h-9 sm:h-8 px-3 rounded-xl sm:rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                userProfile
                  ? "bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[#F5F3EE] font-mono"
                  : "bg-[#F5F3EE] hover:bg-white text-[#0A0A0B] font-semibold"
              }`}
            >
              {authLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8A8780]" />
              ) : userProfile ? (
                <>
                  <User className="w-3.5 h-3.5 text-[#E85D2A]" />
                  <span className="max-w-[78px] sm:max-w-[120px] truncate">
                    @{userProfile.username}
                  </span>
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

      {/* Mobile Ergonomic Floating Bottom Dock (Safe-Area Aware, Zero Footer Overlap) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
      >
        <div className="pointer-events-auto max-w-md mx-auto bg-[#121215]/92 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-1.5 flex items-center justify-between shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex-1 min-h-[44px] py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-[#F5F3EE]" : "text-[#787671]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    transition={{ duration: 0.28, ease: STUDIO_EASE }}
                    className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/[0.1]"
                  />
                )}
                <div className="relative z-10">
                  <Icon
                    className={`w-4 h-4 ${isActive ? "text-[#E85D2A]" : ""}`}
                  />
                  {item.badge && (
                    <span className="absolute -top-1.5 -end-2.5 min-w-[14px] h-[14px] px-1 rounded-full bg-[#E85D2A] text-[#0A0A0B] text-[9px] font-mono font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
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
