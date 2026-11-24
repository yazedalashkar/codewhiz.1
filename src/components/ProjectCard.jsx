import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Instagram, ArrowUpRight, FileArchive } from "lucide-react";

const STUDIO_EASE = [0.22, 1, 0.36, 1];

export default function ProjectCard({ project, lang, onSelect, index }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const description =
    lang === "ar"
      ? project.description_ar || project.description_en
      : project.description_en || project.description_ar;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{
        duration: 0.35,
        ease: STUDIO_EASE,
        delay: Math.min(index * 0.04, 0.24),
      }}
      className="group rounded-2xl bg-[#111114] border border-zinc-800/90 hover:border-zinc-700 overflow-hidden flex flex-col justify-between transition-colors duration-200"
    >
      {/* Illustrative Thumbnail with Skeleton Loader */}
      <div
        onClick={() => onSelect(project)}
        className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950 cursor-pointer border-b border-zinc-800/80"
      >
        {!imgLoaded && (
          <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
        )}
        <img
          src={project.imageUrl}
          alt={project.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover object-center group-hover:scale-[1.03] transition-all duration-500 ease-out ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className="absolute top-2.5 end-2.5 px-2 py-0.5 rounded-md bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-[10px] font-mono text-zinc-300 flex items-center gap-1">
          <FileArchive className="w-3 h-3 text-zinc-400" />
          <span>ZIP</span>
        </div>

        {project.featured && (
          <span className="absolute top-2.5 start-2.5 px-2 py-0.5 rounded-md bg-zinc-950/80 backdrop-blur-sm border border-zinc-700 text-[10px] font-medium text-sky-300">
            {lang === "ar" ? "مختار" : "Selected"}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3.5">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3
              onClick={() => onSelect(project)}
              className="font-semibold text-[15px] text-zinc-100 group-hover:text-white transition-colors cursor-pointer line-clamp-1"
            >
              {project.title}
            </h3>
            <button
              onClick={() => onSelect(project)}
              className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 mt-0.5"
              aria-label="Open details"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-3">
            {description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {(project.tags || []).slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2">
          <motion.a
            whileTap={{ scale: 0.97 }}
            href={project.zipUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="flex-1 h-8 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === "ar" ? "تحميل الملف" : "Download ZIP"}</span>
          </motion.a>

          {project.instaUrl && (
            <motion.a
              whileTap={{ scale: 0.95 }}
              href={project.instaUrl}
              target="_blank"
              rel="noreferrer"
              title={lang === "ar" ? "فيديو المشروع على إنستغرام" : "Watch Reel on Instagram"}
              className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <Instagram className="w-3.5 h-3.5" />
            </motion.a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl bg-[#111114] border border-zinc-800/70 overflow-hidden flex flex-col justify-between animate-pulse">
      <div className="aspect-[16/10] w-full bg-zinc-900 border-b border-zinc-800/60" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 rounded bg-zinc-800" />
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-zinc-900" />
          <div className="h-3 w-4/5 rounded bg-zinc-900" />
        </div>
        <div className="flex gap-1.5 pt-1">
          <div className="h-4 w-12 rounded bg-zinc-900" />
          <div className="h-4 w-14 rounded bg-zinc-900" />
        </div>
        <div className="pt-3 border-t border-zinc-800/60 flex gap-2">
          <div className="h-8 flex-1 rounded-lg bg-zinc-800" />
          <div className="h-8 w-8 rounded-lg bg-zinc-900" />
        </div>
      </div>
    </div>
  );
}
