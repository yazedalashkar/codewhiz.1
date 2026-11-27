import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Instagram,
  FileArchive,
  Bookmark,
  Share2,
  Code2,
} from "lucide-react";

const STUDIO_EASE = [0.22, 1, 0.36, 1];

export default function ProjectModal({
  project,
  lang,
  onClose,
  isSaved,
  onToggleSave,
  onShare,
  onDownload,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [project, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ duration: 0.32, ease: STUDIO_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[#111113] border-t sm:border border-white/10 overflow-hidden shadow-[0_28px_80px_-15px_rgba(0,0,0,0.9)]"
          >
            {/* Mobile Bottom-Sheet Drag Handle */}
            <div className="sm:hidden pt-2.5 pb-1.5 flex justify-center bg-[#111113] shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="overflow-y-auto vault-scroll">
              <div className="relative aspect-[16/9] bg-[#151518] border-b border-white/[0.08]">
                {!imgLoaded && !imgError && (
                  <div className="absolute inset-0 bg-[#18181B] animate-pulse" />
                )}

                {imgError || !project.imageUrl ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#6E6C68]">
                    <Code2 className="w-8 h-8 opacity-60" />
                    <span className="text-xs font-mono">codewhiz.1</span>
                  </div>
                ) : (
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => {
                      setImgError(true);
                      setImgLoaded(true);
                    }}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      imgLoaded ? "opacity-100" : "opacity-0"
                    }`}
                  />
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-3 end-3 w-9 h-9 rounded-xl bg-black/75 hover:bg-black/90 border border-white/15 text-[#F5F3EE] flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <h2 className="text-lg sm:text-xl font-bold text-[#F5F3EE] leading-snug">
                      {project.title}
                    </h2>
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#D6D3CD] flex items-center gap-1 shrink-0">
                      <FileArchive className="w-3.5 h-3.5 text-[#E85D2A]" /> .zip
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(project.tags || []).map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#B6B3AC]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-[#D6D3CD] leading-relaxed">
                  {lang === "ar"
                    ? project.description_ar || project.description_en
                    : project.description_en || project.description_ar}
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <a
                    href={project.zipUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onDownload?.(project)}
                    className="flex-1 h-11 rounded-xl bg-[#F5F3EE] hover:bg-white text-[#0A0A0B] font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {lang === "ar"
                        ? "تحميل الكود المضغوط (.ZIP)"
                        : "Download Source (.ZIP)"}
                    </span>
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleSave?.(project)}
                      className={`flex-1 sm:flex-none h-11 px-4 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                        isSaved
                          ? "bg-[#E85D2A]/15 border-[#E85D2A]/45 text-[#F59E6C]"
                          : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-[#D6D3CD]"
                      }`}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`}
                      />
                      <span>
                        {isSaved
                          ? lang === "ar"
                            ? "محفوظ"
                            : "Saved"
                          : lang === "ar"
                          ? "حفظ"
                          : "Save"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onShare?.(project)}
                      className="h-11 w-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#D6D3CD] flex items-center justify-center transition-colors shrink-0"
                      aria-label={lang === "ar" ? "نسخ الرابط" : "Copy link"}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {project.instaUrl && (
                      <a
                        href={project.instaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-11 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#D6D3CD] hover:text-[#E85D2A] font-medium text-xs flex items-center justify-center gap-2 transition-colors shrink-0"
                      >
                        <Instagram className="w-4 h-4" />
                        <span>{lang === "ar" ? "الفيديو" : "Reel"}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
