import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowUpRight, Globe, Bookmark, FolderCode, X, Hash } from "lucide-react";

export default function CommandPalette({
  isOpen,
  onClose,
  projects,
  lang,
  setLang,
  setActiveTab,
  setSelectedTag,
  onSelectProject,
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects.slice(0, 6);
    return projects
      .filter((p) => {
        const titleMatch = p.title?.toLowerCase().includes(q);
        const arMatch = p.description_ar?.toLowerCase().includes(q);
        const enMatch = p.description_en?.toLowerCase().includes(q);
        const tagMatch = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        return titleMatch || arMatch || enMatch || tagMatch;
      })
      .slice(0, 8);
  }, [projects, query]);

  const topTags = useMemo(() => {
    const counts = new Map();
    projects.forEach((p) => {
      (p.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }, [projects]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-[#111113] border border-white/10 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 h-13 border-b border-white/[0.08]">
              <Search className="w-4 h-4 text-[#E85D2A] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "ابحث عن مشروع، تقنية، أو أمر سريع..."
                    : "Search projects, tags, or jump to section..."
                }
                className="flex-1 h-12 bg-transparent outline-none text-sm text-[#F5F3EE] placeholder:text-[#787671]"
              />
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8A8780] hover:text-[#F5F3EE] hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto vault-scroll p-3 space-y-4">
              {/* Matching Projects */}
              <div>
                <p className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#787671]">
                  {lang === "ar" ? "المشاريع" : "Projects"}
                </p>
                {matches.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-[#787671] text-center">
                    {lang === "ar" ? "لا توجد نتائج مطابقة" : "No matching projects"}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {matches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelectProject(p);
                          onClose();
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.05] flex items-center justify-between gap-3 text-start transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0 bg-[#18181B]"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#F5F3EE] truncate">
                              {p.title}
                            </p>
                            <p className="text-[11px] font-mono text-[#8A8780] truncate">
                              {(p.tags || []).slice(0, 3).join(" · ")}
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#787671] group-hover:text-[#E85D2A] shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Tags */}
              {topTags.length > 0 && (
                <div>
                  <p className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#787671]">
                    {lang === "ar" ? "تصفية سريعة بالتقنية" : "Filter by Stack"}
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {topTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setActiveTab("projects");
                          setSelectedTag(tag);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#E85D2A]/15 border border-white/[0.08] hover:border-[#E85D2A]/40 text-[11px] font-mono text-[#D6D3CD] flex items-center gap-1 transition-colors"
                      >
                        <Hash className="w-3 h-3 text-[#E85D2A]" />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div>
                <p className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#787671]">
                  {lang === "ar" ? "أوامر سريعة" : "Quick Actions"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("projects");
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-xs text-[#D6D3CD] flex items-center gap-2 transition-colors"
                  >
                    <FolderCode className="w-3.5 h-3.5 text-[#E85D2A]" />
                    <span>{lang === "ar" ? "كل المشاريع" : "All Projects"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("saved");
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-xs text-[#D6D3CD] flex items-center gap-2 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#E85D2A]" />
                    <span>{lang === "ar" ? "المحفوظات" : "Saved"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLang(lang === "ar" ? "en" : "ar");
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-xs text-[#D6D3CD] flex items-center gap-2 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#E85D2A]" />
                    <span>{lang === "ar" ? "Switch to EN" : "التبديل للعربية"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-black/30 flex items-center justify-between text-[10px] font-mono text-[#787671]">
              <span>codewhiz.1 // quick jump</span>
              <span>ESC {lang === "ar" ? "للإغلاق" : "to close"}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
