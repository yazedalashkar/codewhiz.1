import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Instagram,
  ArrowUpRight,
  FileArchive,
  Bookmark,
  Share2,
  Code2,
} from "lucide-react";

const STUDIO_EASE = [0.22, 1, 0.36, 1];

export default function ProjectCard({
  project,
  lang,
  onSelect,
  index,
  isSaved,
  onToggleSave,
  onShare,
  onDownload,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const description =
    lang === "ar"
      ? project.description_ar || project.description_en
      : project.description_en || project.description_ar;

  const formattedIndex = String(index + 1).padStart(2, "0");
  const downloadCount = Number(project.downloads) || 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4 }}
      transition={{
        duration: 0.42,
        ease: STUDIO_EASE,
        delay: Math.min((index % 4) * 0.05, 0.2),
      }}
      className="group relative rounded-2xl bg-[#111113]/95 border border-white/[0.08] hover:border-[#E85D2A]/45 overflow-hidden flex flex-col justify-between transition-colors duration-300 shadow-[0_14px_34px_-22px_rgba(0,0,0,0.9)]"
    >
      {/* Top Thumbnail Frame */}
      <div
        onClick={() => onSelect(project)}
        className="relative aspect-[16/10] w-full overflow-hidden bg-[#151518] cursor-pointer border-b border-white/[0.07]"
      >
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 bg-[#18181B] animate-pulse" />
        )}

        {imgError || !project.imageUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#141417] text-[#6E6C68]">
            <Code2 className="w-7 h-7 opacity-60" />
            <span className="text-[10px] font-mono uppercase tracking-widest">
              codewhiz.1 // preview
            </span>
          </div>
        ) : (
          <img
            src={project.imageUrl}
            alt={project.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgError(true);
              setImgLoaded(true);
            }}
            className={`w-full h-full object-cover object-center group-hover:scale-[1.04] transition-all duration-500 ease-out ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Subtle editorial gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20 pointer-events-none" />

        {/* Index & Featured Badges */}
        <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-[#D6D3CD] tabular-nums">
            {formattedIndex}
          </span>
          {project.featured && (
            <span className="px-2 py-0.5 rounded-md bg-[#E85D2A]/90 text-[#0A0A0B] text-[10px] font-semibold">
              {lang === "ar" ? "مختار" : "Selected"}
            </span>
          )}
        </div>

        {/* Save + ZIP Badge */}
        <div className="absolute top-2.5 end-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(project);
            }}
            aria-label={lang === "ar" ? "حفظ المشروع" : "Bookmark project"}
            className={`w-8 h-8 sm:w-7 sm:h-7 rounded-lg backdrop-blur-md border flex items-center justify-center transition-colors ${
              isSaved
                ? "bg-[#E85D2A] border-[#E85D2A] text-[#0A0A0B]"
                : "bg-black/65 border-white/10 text-[#D6D3CD] hover:text-white hover:border-white/25"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
          </button>

          <div className="h-8 sm:h-7 px-2 rounded-lg bg-black/65 backdrop-blur-md border border-white/10 text-[10px] font-mono text-[#D6D3CD] flex items-center gap-1">
            <FileArchive className="w-3 h-3 text-[#E85D2A]" />
            <span>ZIP</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3
              onClick={() => onSelect(project)}
              className="font-semibold text-[15px] text-[#F5F3EE] group-hover:text-white transition-colors cursor-pointer line-clamp-1"
            >
              {project.title}
            </h3>
            <button
              type="button"
              onClick={() => onSelect(project)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#787671] group-hover:text-[#E85D2A] transition-colors shrink-0"
              aria-label="Open details"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#9B9A97] leading-relaxed line-clamp-2 mb-3.5 min-h-[2.4rem]">
            {description}
          </p>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {(project.tags || []).slice(0, 3).map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.07] text-[10px] font-mono text-[#B6B3AC]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {downloadCount > 0 && (
              <span className="text-[10px] font-mono text-[#787671] tabular-nums shrink-0 flex items-center gap-1">
                <Download className="w-2.5 h-2.5" />
                {downloadCount}
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions (Touch-Friendly on Mobile) */}
        <div className="pt-3 border-t border-white/[0.07] flex items-center gap-2">
          <motion.a
            whileTap={{ scale: 0.97 }}
            href={project.zipUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onDownload?.(project)}
            className="flex-1 h-10 sm:h-9 rounded-xl bg-[#F5F3EE] hover:bg-white text-[#0A0A0B] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === "ar" ? "تحميل الكود" : "Download ZIP"}</span>
          </motion.a>

          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={() => onShare?.(project)}
            title={lang === "ar" ? "نسخ رابط المشروع" : "Copy direct link"}
            aria-label={lang === "ar" ? "نسخ رابط المشروع" : "Copy direct link"}
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-[#B6B3AC] hover:text-[#F5F3EE] flex items-center justify-center transition-colors shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
          </motion.button>

          {project.instaUrl && (
            <motion.a
              whileTap={{ scale: 0.94 }}
              href={project.instaUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={
                lang === "ar" ? "فيديو المشروع على إنستغرام" : "Watch Reel on Instagram"
              }
              className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-[#B6B3AC] hover:text-[#E85D2A] flex items-center justify-center transition-colors shrink-0"
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
    <div className="rounded-2xl bg-[#111113] border border-white/[0.07] overflow-hidden flex flex-col justify-between animate-pulse">
      <div className="aspect-[16/10] w-full bg-[#18181B] border-b border-white/[0.06]" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 rounded bg-[#222226]" />
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-[#1A1A1E]" />
          <div className="h-3 w-4/5 rounded bg-[#1A1A1E]" />
        </div>
        <div className="flex gap-1.5 pt-1">
          <div className="h-4 w-12 rounded bg-[#1A1A1E]" />
          <div className="h-4 w-14 rounded bg-[#1A1A1E]" />
        </div>
        <div className="pt-3 border-t border-white/[0.06] flex gap-2">
          <div className="h-9 flex-1 rounded-xl bg-[#222226]" />
          <div className="h-9 w-9 rounded-xl bg-[#1A1A1E]" />
        </div>
      </div>
    </div>
  );
}
