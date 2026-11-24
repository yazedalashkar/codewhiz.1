import { useState, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Instagram,
  Facebook,
  FolderOpen,
  AlertTriangle,
  X,
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
import Navbar from "./components/Navbar";
import ProjectCard, { ProjectCardSkeleton } from "./components/ProjectCard";
import ProjectModal from "./components/ProjectModal";
import AuthModal from "./components/AuthModal";
import AdminVault from "./pages/AdminVault";

const STUDIO_EASE = [0.22, 1, 0.36, 1];

function MainVault() {
  const [lang, setLang] = useState("ar");
  const [activeTab, setActiveTab] = useState("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("ALL");

  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [systemBanner, setSystemBanner] = useState(null);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setSystemBanner(diagnoseError({ code: "missing-env" }, lang));
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
        setSystemBanner(null);
      },
      (err) => {
        setSystemBanner(diagnoseError(err, lang));
        setIsLoadingProjects(false);
      }
    );

    return () => {
      unsubAuth();
      unsubProjects();
    };
  }, [lang]);

  const allTags = useMemo(() => {
    const set = new Set(["ALL"]);
    projects.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 8);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (activeTab === "featured" && !p.featured) return false;
      if (selectedTag !== "ALL" && !(p.tags || []).includes(selectedTag))
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = p.title?.toLowerCase().includes(q);
        const inAr = p.description_ar?.toLowerCase().includes(q);
        const inEn = p.description_en?.toLowerCase().includes(q);
        return inTitle || inAr || inEn;
      }
      return true;
    });
  }, [projects, activeTab, selectedTag, searchQuery]);

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#09090B] studio-grid text-zinc-100 flex flex-col justify-between relative">
      {/* Top & Mobile Dock Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        userProfile={userProfile}
        authLoading={authLoading}
        onOpenAuth={() => setAuthModalOpen(true)}
        totalCount={projects.length}
        isLoadingProjects={isLoadingProjects}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-3.5 pb-24 md:pb-3.5 flex flex-col overflow-hidden">
        {/* System / Environment Diagnostic Banner */}
        <AnimatePresence>
          {systemBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 flex items-start justify-between gap-3 shrink-0"
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
                onClick={() => setSystemBanner(null)}
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: STUDIO_EASE }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="max-w-lg w-full rounded-2xl bg-[#111114] border border-zinc-800 p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-400">@codewhiz.1</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
                    v1.2
                  </span>
                </div>

                <h1 className="text-xl font-bold text-zinc-100">
                  {lang === "ar"
                    ? "أرشيف المشاريع البرمجية"
                    : "Source Code Archive"}
                </h1>

                <p className="text-sm text-zinc-400 leading-relaxed">
                  {lang === "ar"
                    ? "هنا تجد جميع الأكواد والسكربتات والمشاريع المنشورة على حساب codewhiz.1، مرتّبة وجاهزة للتحميل المباشر بصيغة ZIP مع معاينة سريعة ورابط الفيديو الخاص بكل مشروع."
                    : "Direct access to every script, tool, and project featured on @codewhiz.1 — packaged as ready-to-run ZIP archives with video references."}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <a
                    href="https://instagram.com/lia.yazed"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-2 transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Instagram</span>
                  </a>
                  <a
                    href="https://facebook.com/lia.yazed"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-2 transition-colors"
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: STUDIO_EASE }}
              className="flex-1 flex flex-col overflow-hidden gap-3.5"
            >
              {/* Search & Tag Filter Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute top-3 start-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      lang === "ar"
                        ? "ابحث باسم المشروع أو التقنية..."
                        : "Search projects or technologies..."
                    }
                    className="w-full h-9 ps-9 pe-3.5 rounded-xl bg-[#111114] border border-zinc-800 focus:border-zinc-600 outline-none text-xs text-zinc-100 placeholder:text-zinc-500 transition-colors"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {allTags.map((tag) => {
                    const active = selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`relative px-3 py-1.5 rounded-lg text-[11px] font-mono shrink-0 border transition-colors ${
                          active
                            ? "bg-zinc-100 border-zinc-100 text-zinc-950 font-semibold"
                            : "bg-[#111114] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                        }`}
                      >
                        {tag === "ALL" ? (lang === "ar" ? "الكل" : "All") : tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Grid Area */}
              <div className="flex-1 overflow-y-auto vault-scroll pe-1 pb-2">
                {isLoadingProjects ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <ProjectCardSkeleton key={idx} />
                    ))}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                    <FolderOpen className="w-6 h-6 text-zinc-600" />
                    <p className="text-xs">
                      {lang === "ar"
                        ? "لا توجد مشاريع مطابقة للبحث حالياً"
                        : "No matching projects found"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                      {filteredProjects.map((project, idx) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          lang={lang}
                          index={idx}
                          onSelect={setSelectedProject}
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

      {/* Fixed Minimal Designer Attribution Footer */}
      <footer className="h-9 px-4 md:px-8 border-t border-zinc-800/90 bg-[#09090B]/95 backdrop-blur-sm flex items-center justify-between text-[11px] text-zinc-500 z-30 shrink-0">
        <div className="flex items-center gap-1.5">
          <span>{lang === "ar" ? "تصميم وتطوير:" : "Designed & built by"}</span>
          <span className="font-semibold text-zinc-200">
            {lang === "ar" ? "يازد الأشقر" : "Yazed Al-Ashkar"}
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <a
            href="https://instagram.com/lia.yazed"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instagram</span>
          </a>
          <a
            href="https://facebook.com/lia.yazed"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            <Facebook className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Facebook</span>
          </a>
        </div>
      </footer>

      {/* Modals */}
      <ProjectModal
        project={selectedProject}
        lang={lang}
        onClose={() => setSelectedProject(null)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        lang={lang}
        userProfile={userProfile}
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
      </Routes>
    </BrowserRouter>
  );
}
