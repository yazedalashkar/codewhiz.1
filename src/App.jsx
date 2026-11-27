import { useState, useEffect, useMemo, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Instagram,
  Facebook,
  FolderOpen,
  AlertTriangle,
  X,
  Users,
  Bookmark,
  ArrowDownUp,
  Layers,
  CalendarClock,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./lib/firebase";
import { diagnoseError, withTimeout } from "./lib/diagnostics";
import {
  subscribeMonthlyVisitors,
  formatMonthLabel,
  getDaysRemainingInMonth,
  trackProjectDownload,
} from "./lib/analytics";
import Navbar from "./components/Navbar";
import ScrollSculptures from "./components/ScrollSculptures";
import ProjectCard, { ProjectCardSkeleton } from "./components/ProjectCard";
import ProjectModal from "./components/ProjectModal";
import AuthModal from "./components/AuthModal";
import CommandPalette from "./components/CommandPalette";
import { useToast } from "./components/ToastProvider";
import AdminVault from "./pages/AdminVault";

const STUDIO_EASE = [0.22, 1, 0.36, 1];
const SAVED_STORAGE_KEY = "cw_saved_project_ids_v1";

function readSavedIds() {
  try {
    const raw = localStorage.getItem(SAVED_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function MainVault() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [lang, setLang] = useState("ar");
  const [activeTab, setActiveTab] = useState("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");

  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [savedIds, setSavedIds] = useState(readSavedIds);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [rawSystemError, setRawSystemError] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [visitorStats, setVisitorStats] = useState({
    count: 0,
    monthKey: "",
    source: "firestore",
    loading: true,
  });

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Subscribe to Firebase Auth & Projects (independent of lang so toggling language never re-subscribes!)
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setRawSystemError({ code: "missing-env" });
      setAuthLoading(false);
      setIsLoadingProjects(false);
      return;
    }

    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      if (u) {
        try {
          const snap = await withTimeout(getDoc(doc(db, "users", u.uid)), 7000);
          setUserProfile(
            snap.exists()
              ? snap.data()
              : { username: u.displayName || "dev", email: u.email }
          );
        } catch {
          setUserProfile({ username: u.displayName || "dev", email: u.email });
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubProjects = onSnapshot(
      q,
      (snap) => {
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setIsLoadingProjects(false);
        setRawSystemError(null);
      },
      (err) => {
        setRawSystemError(err);
        setIsLoadingProjects(false);
      }
    );

    return () => {
      unsubAuth();
      unsubProjects();
    };
  }, []);

  // Subscribe & increment Monthly Visitor Counter (auto-resets every month)
  useEffect(() => {
    const unsub = subscribeMonthlyVisitors((stats) => {
      setVisitorStats(stats);
    });
    return () => unsub();
  }, []);

  // Open project automatically if deep-linked via ?project=<id>
  useEffect(() => {
    const linkedId = searchParams.get("project");
    if (linkedId && projects.length > 0) {
      const found = projects.find((p) => p.id === linkedId);
      if (found) {
        setSelectedProject(found);
      }
    }
  }, [searchParams, projects]);

  const systemBanner = useMemo(() => {
    if (!rawSystemError || bannerDismissed) return null;
    return diagnoseError(rawSystemError, lang);
  }, [rawSystemError, bannerDismissed, lang]);

  const handleSelectProject = useCallback(
    (project) => {
      setSelectedProject(project);
      if (project?.id) {
        setSearchParams({ project: project.id }, { replace: true });
      }
    },
    [setSearchParams]
  );

  const handleCloseProject = useCallback(() => {
    setSelectedProject(null);
    if (searchParams.has("project")) {
      searchParams.delete("project");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleToggleSave = useCallback(
    (project) => {
      setSavedIds((prev) => {
        const exists = prev.includes(project.id);
        const next = exists
          ? prev.filter((id) => id !== project.id)
          : [...prev, project.id];
        try {
          localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        if (exists) {
          toast.info(
            lang === "ar" ? "تمت الإزالة من المحفوظات" : "Removed from Saved",
            project.title
          );
        } else {
          toast.success(
            lang === "ar" ? "تم الحفظ في المحفوظات" : "Saved to Bookmarks",
            project.title
          );
        }
        return next;
      });
    },
    [lang, toast]
  );

  const handleShareProject = useCallback(
    async (project) => {
      const url = `${window.location.origin}/?project=${encodeURIComponent(project.id)}`;
      try {
        if (navigator.share) {
          await navigator.share({
            title: `${project.title} — codewhiz.1`,
            url,
          });
          return;
        }
      } catch {
        // User cancelled native share or unsupported -> fallback to clipboard
      }

      try {
        await navigator.clipboard.writeText(url);
        toast.success(
          lang === "ar" ? "تم نسخ رابط المشروع" : "Project link copied",
          project.title
        );
      } catch {
        toast.info(
          lang === "ar" ? "رابط المشروع جاهز" : "Direct link",
          url
        );
      }
    },
    [lang, toast]
  );

  const handleDownloadProject = useCallback(
    (project) => {
      trackProjectDownload(project.id);
      toast.success(
        lang === "ar" ? "بدأ تحميل ملف الكود" : "Download started",
        `${project.title} (.ZIP)`
      );
    },
    [lang, toast]
  );

  // Tags sorted by popularity
  const allTags = useMemo(() => {
    const counts = new Map();
    projects.forEach((p) => {
      (p.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    });
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
    return ["ALL", ...sorted];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const list = projects.filter((p) => {
      if (activeTab === "featured" && !p.featured) return false;
      if (activeTab === "saved" && !savedIds.includes(p.id)) return false;
      if (selectedTag !== "ALL" && !(p.tags || []).includes(selectedTag)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = p.title?.toLowerCase().includes(q);
        const inAr = p.description_ar?.toLowerCase().includes(q);
        const inEn = p.description_en?.toLowerCase().includes(q);
        const inTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        return inTitle || inAr || inEn || inTags;
      }
      return true;
    });

    if (sortBy === "downloads") {
      return [...list].sort(
        (a, b) => (Number(b.downloads) || 0) - (Number(a.downloads) || 0)
      );
    }
    if (sortBy === "featured") {
      return [...list].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }
    return list;
  }, [projects, activeTab, savedIds, selectedTag, searchQuery, sortBy]);

  const monthLabel = useMemo(
    () => (visitorStats.monthKey ? formatMonthLabel(visitorStats.monthKey, lang) : ""),
    [visitorStats.monthKey, lang]
  );
  const daysLeft = useMemo(() => getDaysRemainingInMonth(), []);

  return (
    <div className="min-h-dvh w-full bg-[#0A0A0B] studio-grid text-[#F5F3EE] flex flex-col relative">
      {/* 3D Scroll-Driven Sculptures & Progress Bar */}
      <ScrollSculptures />

      {/* Top & Mobile Dock Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        userProfile={userProfile}
        authLoading={authLoading}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenCommand={() => setCommandOpen(true)}
        totalCount={projects.length}
        savedCount={savedIds.length}
        isLoadingProjects={isLoadingProjects}
      />

      {/* Main Content Flow */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-7 pb-10">
        {/* System / Environment Diagnostic Banner */}
        <AnimatePresence>
          {systemBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold">{systemBanner.title}</p>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    {systemBanner.detail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="text-amber-300/70 hover:text-amber-100 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === "about" ? (
            <motion.section
              key="about-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: STUDIO_EASE }}
              className="py-6 sm:py-12 max-w-3xl mx-auto space-y-5"
            >
              <div className="rounded-3xl bg-[#111113]/95 border border-white/[0.08] p-6 sm:p-9 space-y-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#E85D2A]" />
                    <span className="font-mono text-xs text-[#D6D3CD]">
                      @codewhiz.1 // studio archive
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#9B9A97]">
                    v2.0
                  </span>
                </div>

                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F3EE] leading-snug">
                    {lang === "ar"
                      ? "مختبر الأكواد والمشاريع البرمجية"
                      : "Curated Source Code Archive"}
                  </h1>
                  <p className="text-sm sm:text-[15px] text-[#9B9A97] leading-relaxed">
                    {lang === "ar"
                      ? "هنا تجد جميع الأكواد والسكربتات والأدوات المنشورة على حساب codewhiz.1، مفهرسة بدقة وجاهزة للتحميل المباشر بصيغة ZIP مع معاينة مرئية ورابط الفيديو التوضيحي لكل مشروع."
                      : "Direct access to every script, utility, and interface featured on @codewhiz.1 — curated and packaged as clean, ready-to-run ZIP archives with video references."}
                  </p>
                </div>

                {/* Live Telemetry Cards including Monthly Resetting Visitor Counter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.07] space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#8A8780]">
                      <span>{lang === "ar" ? "زوار هذا الشهر" : "Monthly Visitors"}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-2xl font-mono font-bold text-[#F5F3EE] tabular-nums">
                      {visitorStats.loading ? "—" : visitorStats.count.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-mono text-[#787671] flex items-center gap-1">
                      <CalendarClock className="w-3 h-3 text-[#E85D2A]" />
                      <span>
                        {lang === "ar"
                          ? `${monthLabel} · يتصفر بعد ${daysLeft} يوم`
                          : `${monthLabel} · resets in ${daysLeft}d`}
                      </span>
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.07] space-y-1">
                    <span className="text-[11px] text-[#8A8780]">
                      {lang === "ar" ? "المشاريع المتاحة" : "Published Builds"}
                    </span>
                    <p className="text-2xl font-mono font-bold text-[#F5F3EE] tabular-nums">
                      {projects.length}
                    </p>
                    <p className="text-[10px] font-mono text-[#787671]">
                      {lang === "ar" ? "أرشيف ZIP جاهز للتشغيل" : "Ready-to-run ZIPs"}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.07] space-y-1">
                    <span className="text-[11px] text-[#8A8780]">
                      {lang === "ar" ? "محفوظاتك" : "Your Bookmarks"}
                    </span>
                    <p className="text-2xl font-mono font-bold text-[#F5F3EE] tabular-nums">
                      {savedIds.length}
                    </p>
                    <p className="text-[10px] font-mono text-[#787671]">
                      {lang === "ar" ? "محفوظة على جهازك" : "Stored on device"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <a
                    href="https://instagram.com/lia.yazed"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-xl bg-[#F5F3EE] hover:bg-white text-[#0A0A0B] text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Instagram</span>
                  </a>
                  <a
                    href="https://facebook.com/lia.yazed"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[#F5F3EE] text-xs font-medium flex items-center gap-2 transition-colors"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                    <span>Facebook</span>
                  </a>
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="projects-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: STUDIO_EASE }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Editorial Studio Hero */}
              <div className="rounded-3xl bg-[#111113]/80 backdrop-blur-md border border-white/[0.08] p-5 sm:p-8 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#D6D3CD]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E85D2A]" />
                      <span>
                        {activeTab === "featured"
                          ? lang === "ar"
                            ? "مختارات المحرر"
                            : "EDITOR'S SELECTION"
                          : activeTab === "saved"
                          ? lang === "ar"
                            ? "مكتبتك المحفوظة"
                            : "SAVED LIBRARY"
                          : lang === "ar"
                          ? "الأرشيف البرمجي المفتوح"
                          : "OPEN SOURCE ARCHIVE"}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#F5F3EE] leading-[1.2]">
                      {activeTab === "saved"
                        ? lang === "ar"
                          ? "المشاريع المحفوظة للرجوع إليها"
                          : "Your Saved Builds"
                        : activeTab === "featured"
                        ? lang === "ar"
                          ? "أبرز المشاريع المختارة بعناية"
                          : "Selected Studio Highlights"
                        : lang === "ar"
                        ? "أكواد ومشاريع جاهزة للتشغيل الفوري"
                        : "Crafted code & utilities, ready to run."}
                    </h1>

                    <p className="text-xs sm:text-sm text-[#9B9A97] leading-relaxed max-w-xl">
                      {lang === "ar"
                        ? "تصفّح مشاريع codewhiz.1 المصممة بعناية، احفظ ما يعجبك، أو حمّل ملف الـ ZIP الكامل بنقرة واحدة."
                        : "Explore curated builds from @codewhiz.1, bookmark favorites, or grab the complete ZIP source archive in one click."}
                    </p>
                  </div>

                  {/* Compact Editorial Telemetry Strip (including Monthly Visitors!) */}
                  <div className="grid grid-cols-2 sm:flex items-center gap-2.5 shrink-0">
                    <div className="px-3.5 py-2.5 rounded-2xl bg-black/45 border border-white/[0.07] min-w-[120px]">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A8780]">
                        <Layers className="w-3 h-3 text-[#E85D2A]" />
                        <span>{lang === "ar" ? "المشاريع" : "BUILDS"}</span>
                      </div>
                      <p className="text-lg font-mono font-bold text-[#F5F3EE] tabular-nums mt-0.5">
                        {isLoadingProjects ? "—" : projects.length}
                      </p>
                    </div>

                    <div
                      title={
                        lang === "ar"
                          ? `عداد زوار ${monthLabel} — يتصفر تلقائياً بداية كل شهر`
                          : `${monthLabel} visitors — resets automatically each month`
                      }
                      className="px-3.5 py-2.5 rounded-2xl bg-black/45 border border-white/[0.07] min-w-[140px]"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#8A8780]">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-emerald-400" />
                          <span>{lang === "ar" ? "زوار الشهر" : "MONTHLY"}</span>
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <p className="text-lg font-mono font-bold text-[#F5F3EE] tabular-nums">
                          {visitorStats.loading
                            ? "—"
                            : visitorStats.count.toLocaleString()}
                        </p>
                        <span className="text-[10px] font-mono text-[#787671] truncate max-w-[74px]">
                          {monthLabel.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search, Sort & Tag Filter Toolbar */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1 sm:max-w-md">
                    <Search className="w-4 h-4 text-[#787671] absolute top-3.5 sm:top-3 start-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        lang === "ar"
                          ? "ابحث باسم المشروع، الوصف، أو التقنية..."
                          : "Search by title, description, or stack..."
                      }
                      className="w-full h-11 sm:h-10 ps-10 pe-9 rounded-xl bg-[#111113]/95 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs text-[#F5F3EE] placeholder:text-[#787671] transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                        className="absolute top-3 sm:top-2.5 end-2.5 p-1 rounded-md text-[#787671] hover:text-[#F5F3EE]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort Control */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:flex-none">
                      <ArrowDownUp className="w-3.5 h-3.5 text-[#E85D2A] absolute top-3.5 sm:top-3 start-3 pointer-events-none" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        aria-label={lang === "ar" ? "ترتيب المشاريع" : "Sort projects"}
                        className="w-full sm:w-auto h-11 sm:h-10 ps-9 pe-7 rounded-xl bg-[#111113]/95 border border-white/[0.08] focus:border-[#E85D2A]/60 outline-none text-xs text-[#D6D3CD] cursor-pointer appearance-none"
                      >
                        <option value="newest">
                          {lang === "ar" ? "الأحدث أولاً" : "Newest first"}
                        </option>
                        <option value="downloads">
                          {lang === "ar" ? "الأكثر تحميلاً" : "Most downloaded"}
                        </option>
                        <option value="featured">
                          {lang === "ar" ? "المختارات أولاً" : "Featured first"}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Horizontal Momentum-Scrolling Tag Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                  {allTags.map((tag) => {
                    const active = selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag)}
                        className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-[11px] font-mono shrink-0 border transition-all ${
                          active
                            ? "bg-[#F5F3EE] border-[#F5F3EE] text-[#0A0A0B] font-semibold"
                            : "bg-[#111113]/90 border-white/[0.08] text-[#9B9A97] hover:text-[#F5F3EE] hover:border-white/20"
                        }`}
                      >
                        {tag === "ALL" ? (lang === "ar" ? "الكل" : "All") : tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Projects Grid */}
              <div>
                {isLoadingProjects ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <ProjectCardSkeleton key={idx} />
                    ))}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="py-20 rounded-3xl bg-[#111113]/70 border border-white/[0.06] flex flex-col items-center justify-center text-center px-6 gap-3">
                    {activeTab === "saved" ? (
                      <Bookmark className="w-7 h-7 text-[#6E6C68]" />
                    ) : (
                      <FolderOpen className="w-7 h-7 text-[#6E6C68]" />
                    )}
                    <p className="text-sm font-medium text-[#D6D3CD]">
                      {activeTab === "saved"
                        ? lang === "ar"
                          ? "لم تحفظ أي مشروع بعد"
                          : "No bookmarked projects yet"
                        : lang === "ar"
                        ? "لا توجد مشاريع مطابقة لبحثك حالياً"
                        : "No matching projects found"}
                    </p>
                    {(searchQuery || selectedTag !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedTag("ALL");
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs text-[#F5F3EE] transition-colors"
                      >
                        {lang === "ar" ? "إعادة ضبط الفلاتر" : "Reset filters"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    <AnimatePresence mode="popLayout">
                      {filteredProjects.map((project, idx) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          lang={lang}
                          index={idx}
                          isSaved={savedIds.includes(project.id)}
                          onToggleSave={handleToggleSave}
                          onShare={handleShareProject}
                          onDownload={handleDownloadProject}
                          onSelect={handleSelectProject}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Editorial Footer with Live Monthly Visitors Pill & Safe Mobile Clearance */}
      <footer className="relative z-10 mt-auto border-t border-white/[0.07] bg-[#0A0A0B]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 pt-5 pb-24 md:pb-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#8A8780]">
          <div className="flex items-center gap-1.5">
            <span>{lang === "ar" ? "تصميم وتطوير:" : "Designed & built by"}</span>
            <span className="font-semibold text-[#F5F3EE]">
              {lang === "ar" ? "يازد الأشقر" : "Yazed Al-Ashkar"}
            </span>
          </div>

          {/* Monthly Resetting Visitors Counter Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111113] border border-white/[0.08] font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#9B9A97]">
              {lang === "ar" ? "زوار الشهر:" : "Monthly visits:"}
            </span>
            <span className="text-[#F5F3EE] font-semibold tabular-nums">
              {visitorStats.loading ? "..." : visitorStats.count.toLocaleString()}
            </span>
            <span className="text-[#6E6C68]">·</span>
            <span className="text-[#8A8780]">
              {lang === "ar" ? "يتجدد شهرياً" : "Resets monthly"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/lia.yazed"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F5F3EE] transition-colors flex items-center gap-1.5"
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>Instagram</span>
            </a>
            <a
              href="https://facebook.com/lia.yazed"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F5F3EE] transition-colors flex items-center gap-1.5"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>Facebook</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Modals & Command Palette */}
      <ProjectModal
        project={selectedProject}
        lang={lang}
        onClose={handleCloseProject}
        isSaved={selectedProject ? savedIds.includes(selectedProject.id) : false}
        onToggleSave={handleToggleSave}
        onShare={handleShareProject}
        onDownload={handleDownloadProject}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        lang={lang}
        userProfile={userProfile}
      />

      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        projects={projects}
        lang={lang}
        setLang={setLang}
        setActiveTab={setActiveTab}
        setSelectedTag={setSelectedTag}
        onSelectProject={handleSelectProject}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainVault />} />
        <Route path="/vault-admin" element={<AdminVault />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
