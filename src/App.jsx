import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from "framer-motion";
import { Search, Instagram, Facebook, FolderOpen, AlertTriangle, X, ArrowDown, Sparkles } from "lucide-react";
import { collection, onSnapshot, orderBy, query, doc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured, bumpDownloads } from "./lib/firebase";
import { diagnoseError, withTimeout } from "./lib/diagnostics";
import Scene3D from "./components/Scene3D";
import Navbar from "./components/Navbar";
import ProjectCard, { ProjectCardSkeleton } from "./components/ProjectCard";
import ProjectModal from "./components/ProjectModal";
import AuthModal from "./components/AuthModal";
import AdminVault from "./pages/AdminVault";

const EASE = [0.22, 1, 0.36, 1];

function Marquee({ words }) {
  const { scrollY } = useScroll();
  const spring = useSpring(scrollY, { stiffness: 80, damping: 20 });
  const x = useTransform(spring, (v) => -v * 0.45);
  const row = Array.from({ length: 8 }).flatMap(() => words);
  return (
    <div className="relative z-10 -rotate-2 bg-sun text-ink py-3 overflow-hidden border-y-2 border-ink" aria-hidden>
      <motion.div style={{ x }} className="flex w-max items-center gap-8 font-display text-3xl md:text-5xl whitespace-nowrap">
        {row.map((w, i) => (
          <span key={i} className="flex items-center gap-8">
            {w}
            <span className="h-3 w-3 rounded-full bg-ink" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function MainVault() {
  const [lang, setLang] = useState("ar");
  const [activeTab, setActiveTab] = useState("projects");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("ALL");
  const [sort, setSort] = useState("new");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sysError, setSysError] = useState(null);
  const [bannerOpen, setBannerOpen] = useState(true);
  const searchRef = useRef(null);
  const ar = lang === "ar";

  const banner = sysError && bannerOpen ? diagnoseError(sysError, lang) : null;

  useEffect(() => {
    document.documentElement.dir = ar ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, ar]);

  // one subscription for the whole session (the old version re-subscribed on every language switch)
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setSysError({ code: "missing-env" });
      setAuthLoading(false);
      setLoading(false);
      return;
    }
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      if (u) {
        try {
          const snap = await withTimeout(getDoc(doc(db, "users", u.uid)), 7000);
          setUserProfile(snap.exists() ? snap.data() : { username: u.displayName || "dev", email: u.email });
        } catch {
          setUserProfile({ username: u.displayName || "dev", email: u.email });
        }
      } else setUserProfile(null);
      setAuthLoading(false);
    });
    const unsubProjects = onSnapshot(
      query(collection(db, "projects"), orderBy("createdAt", "desc")),
      (snap) => {
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setSysError(null);
      },
      (err) => { setSysError(err); setBannerOpen(true); setLoading(false); }
    );
    return () => { unsubAuth(); unsubProjects(); };
  }, []);

  // deep link ?p=<id>
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !projects.length) return;
    const id = new URLSearchParams(location.search).get("p");
    deepLinked.current = true;
    const hit = id && projects.find((p) => p.id === id);
    if (hit) setSelected(hit);
  }, [projects]);

  const openProject = useCallback((p) => {
    setSelected(p);
    history.replaceState(null, "", `/?p=${p.id}`);
  }, []);
  const closeProject = useCallback(() => {
    setSelected(null);
    history.replaceState(null, "", "/");
  }, []);

  // "/" jumps to search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || "")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const navigate = (id) => {
    if (id === "top") { setActiveTab("projects"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setActiveTab(id);
    scrollToId(id === "about" ? "about" : "projects");
  };

  const allTags = useMemo(() => {
    const count = {};
    projects.forEach((p) => (p.tags || []).forEach((t) => (count[t] = (count[t] || 0) + 1)));
    return ["ALL", ...Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 10)];
  }, [projects]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = projects.filter((p) => {
      if (activeTab === "featured" && !p.featured) return false;
      if (tag !== "ALL" && !(p.tags || []).includes(tag)) return false;
      if (!q) return true;
      return [p.title, p.description_ar, p.description_en, ...(p.tags || [])].some((s) => s?.toLowerCase().includes(q));
    });
    if (sort === "popular") out.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    return out;
  }, [projects, activeTab, tag, search, sort]);

  const totalDownloads = useMemo(() => projects.reduce((n, p) => n + (p.downloads || 0), 0), [projects]);

  // hero text drifts away as you scroll
  const heroRef = useRef(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroP, [0, 1], [0, 140]);
  const heroOpacity = useTransform(heroP, [0, 0.8], [1, 0]);

  const marqueeWords = allTags.length > 1 ? allTags.slice(1) : ["ZIP", "CODE", "SOURCE", "PYTHON", "REACT"];

  const t = {
    h1a: ar ? "خزنة الأكواد" : "The Code Vault",
    h1b: ar ? "كل مشروع في ملف ZIP واحد" : "One ZIP for every project",
    sub: ar
      ? "كل سكربت وأداة ظهرت في فيديوهات codewhiz.1، مرتّبة هنا وجاهزة للتحميل والتشغيل."
      : "Every script and tool from the codewhiz.1 videos, packed here and ready to download and run.",
  };

  return (
    <div className="relative bg-ink text-bone">
      <Scene3D flip={!ar} />
      <Navbar
        activeTab={activeTab}
        onNavigate={navigate}
        lang={lang}
        setLang={setLang}
        userProfile={userProfile}
        authLoading={authLoading}
        onOpenAuth={() => setAuthOpen(true)}
        totalCount={projects.length}
        isLoadingProjects={loading}
      />

      {/* HERO */}
      <section ref={heroRef} className="relative z-10 min-h-[100svh] flex items-center px-5 md:px-10 pt-28 pb-36">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-6xl mx-auto w-full">
          <motion.h1
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            className="font-display leading-[0.95] text-[clamp(3.6rem,13vw,10rem)]"
          >
            {t.h1a}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.4 }}
            className="mt-4 md:mt-6 font-display text-2xl md:text-4xl text-flare"
          >
            {t.h1b}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-5 max-w-md text-base md:text-lg text-bone/70 leading-8"
          >
            {t.sub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.9 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => navigate("projects")}
              className="h-14 px-8 rounded-full bg-flare text-ink font-semibold text-base active:scale-95 transition-transform"
            >
              {ar ? "تصفّح المشاريع" : "Browse projects"}
            </button>
            <a
              href="https://instagram.com/lia.yazed"
              target="_blank"
              rel="noreferrer"
              className="h-14 px-6 rounded-full border-2 border-haze text-bone flex items-center gap-2 font-medium active:scale-95 transition-transform"
            >
              <Instagram className="w-5 h-5" />
              {ar ? "شاهد الفيديوهات" : "Watch the videos"}
            </a>
          </motion.div>

          {!loading && projects.length > 0 && (
            <p className="mt-8 text-sm text-bone/50 tabular-nums">
              {ar
                ? `${projects.length} مشروع${totalDownloads ? ` وأكثر من ${totalDownloads} تحميل` : ""}`
                : `${projects.length} projects${totalDownloads ? `, ${totalDownloads} downloads` : ""}`}
            </p>
          )}
        </motion.div>

        <motion.button
          onClick={() => navigate("projects")}
          aria-label="Scroll"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="hidden md:flex absolute bottom-10 inset-x-0 mx-auto h-12 w-12 rounded-full border-2 border-haze items-center justify-center text-bone/70"
        >
          <ArrowDown className="w-5 h-5" />
        </motion.button>
      </section>

      <Marquee words={marqueeWords} />

      {/* PROJECTS */}
      <section id="projects" className="relative z-10 px-4 md:px-10 pt-16 md:pt-24 pb-28">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence>
            {banner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-5"
              >
                <div className="p-4 rounded-2xl bg-sun/15 border-2 border-sun/40 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-sun shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm space-y-1">
                    <p className="font-semibold">{banner.title}</p>
                    <p className="text-bone/75 leading-6">{banner.detail}</p>
                  </div>
                  <button onClick={() => setBannerOpen(false)} aria-label="Dismiss" className="h-9 w-9 -m-1.5 flex items-center justify-center text-bone/60">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <h2 className="font-display text-4xl md:text-6xl mb-6">
            {activeTab === "featured" ? (ar ? "المختارات" : "Selected") : ar ? "كل المشاريع" : "All projects"}
          </h2>

          {/* toolbar: sticks under the nav so filtering stays in reach while scrolling */}
          <div className="sticky top-[72px] md:top-[80px] z-30 -mx-4 md:-mx-10 px-4 md:px-10 py-3 bg-ink/85 backdrop-blur-md space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1 md:max-w-md">
                <Search className="w-4 h-4 text-bone/40 absolute top-1/2 -translate-y-1/2 start-4 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={ar ? "ابحث بالاسم أو التقنية" : "Search by name or tech"}
                  className="field ps-11 rounded-full"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label={ar ? "الترتيب" : "Sort"}
                className="field !w-auto rounded-full pe-8 cursor-pointer"
              >
                <option value="new">{ar ? "الأحدث" : "Newest"}</option>
                <option value="popular">{ar ? "الأكثر تحميلاً" : "Most downloaded"}</option>
              </select>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {allTags.map((tg) => (
                <button
                  key={tg}
                  onClick={() => setTag(tg)}
                  className={`h-10 px-4 rounded-full text-sm shrink-0 border-2 transition-colors ${
                    tag === tg ? "bg-bone text-ink border-bone font-semibold" : "border-haze text-bone/70 active:bg-haze"
                  }`}
                >
                  {tg === "ALL" ? (ar ? "الكل" : "All") : tg}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
              </div>
            ) : list.length === 0 ? (
              <div className="py-24 flex flex-col items-center gap-3 text-bone/50 text-center">
                <FolderOpen className="w-10 h-10" />
                <p>
                  {projects.length === 0
                    ? ar ? "لم يُنشر أي مشروع بعد." : "No projects published yet."
                    : ar ? "لا نتائج. جرّب كلمة أخرى أو اختر «الكل»." : "No matches. Try another word or pick All."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 pe-2">
                {list.map((p, i) => (
                  <ProjectCard key={p.id} project={p} lang={lang} index={i} onSelect={openProject} onDownload={(x) => bumpDownloads(x.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="relative z-10 px-4 md:px-10 pb-40 md:pb-24">
        <div className="max-w-6xl mx-auto rounded-[32px] bg-plum border-2 border-haze p-7 md:p-14 grid md:grid-cols-[1.4fr_1fr] gap-8 items-end">
          <div>
            <h2 className="font-display text-4xl md:text-6xl leading-tight">
              {ar ? "من وراء الكود" : "Who's behind the code"}
            </h2>
            <p className="mt-4 text-bone/75 leading-8 max-w-lg">
              {ar
                ? "هذا الأرشيف يجمع كل ما ينشره @codewhiz.1: سكربتات وأدوات ومشاريع صغيرة، كل واحد منها بملف ZIP جاهز وبرابط الفيديو الذي شرحه."
                : "This archive collects everything @codewhiz.1 publishes: scripts, tools and small projects, each as a ready ZIP with a link to the video that explains it."}
            </p>
            <p className="mt-3 text-sm text-bone/50 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sun" />
              {ar ? "تصميم وتطوير يازد الأشقر" : "Designed & built by Yazed Al-Ashkar"}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a href="https://instagram.com/lia.yazed" target="_blank" rel="noreferrer"
              className="h-14 rounded-2xl bg-flare text-ink font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
              <Instagram className="w-5 h-5" /> Instagram
            </a>
            <a href="https://facebook.com/lia.yazed" target="_blank" rel="noreferrer"
              className="h-14 rounded-2xl bg-ink text-bone font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
              <Facebook className="w-5 h-5" /> Facebook
            </a>
          </div>
        </div>
      </section>

      <ProjectModal project={selected} lang={lang} onClose={closeProject} onDownload={(p) => bumpDownloads(p.id)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} lang={lang} userProfile={userProfile} />
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
