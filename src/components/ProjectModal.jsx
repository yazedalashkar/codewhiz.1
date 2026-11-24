import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Instagram, FileArchive } from "lucide-react";

const STUDIO_EASE = [0.22, 1, 0.36, 1];

export default function ProjectModal({ project, lang, onClose }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
  }, [project?.id]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: STUDIO_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-[#111114] border border-zinc-800 overflow-hidden shadow-2xl"
          >
            <div className="relative aspect-[16/9] bg-zinc-950 border-b border-zinc-800">
              {!imgLoaded && (
                <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
              )}
              <img
                src={project.imageUrl}
                alt={project.title}
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
              <button
                onClick={onClose}
                className="absolute top-3 end-3 w-8 h-8 rounded-lg bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-lg font-bold text-zinc-100">{project.title}</h2>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                    <FileArchive className="w-3 h-3" /> .zip
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(project.tags || []).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">
                {lang === "ar"
                  ? project.description_ar || project.description_en
                  : project.description_en || project.description_ar}
              </p>

              <div className="pt-2 flex items-center gap-2.5">
                <a
                  href={project.zipUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 h-10 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {lang === "ar" ? "تحميل الكود المضغوط (.ZIP)" : "Download Source (.ZIP)"}
                  </span>
                </a>

                {project.instaUrl && (
                  <a
                    href={project.instaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium text-xs flex items-center gap-2 transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>{lang === "ar" ? "الفيديو" : "Reel"}</span>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
