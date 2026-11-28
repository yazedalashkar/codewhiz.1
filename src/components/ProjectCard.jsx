import { useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { Download, Instagram, FileArchive } from "lucide-react";
import { ACCENTS, formatSize } from "../lib/format";

export default function ProjectCard({ project, lang, onSelect, onDownload, index }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const accent = ACCENTS[index % ACCENTS.length];

  // scroll-scrubbed entrance + inner image parallax
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const enter = useTransform(scrollYProgress, [0, 0.22], [0, 1]);
  const enterSmooth = useSpring(enter, { stiffness: 90, damping: 20 });
  const y = useTransform(enterSmooth, [0, 1], [70, 0]);
  const opacity = useTransform(enterSmooth, [0, 1], [0, 1]);
  const rotX = useTransform(enterSmooth, [0, 1], [14, 0]);
  const imgY = useTransform(scrollYProgress, [0, 1], ["-9%", "9%"]);

  // pointer tilt (mouse only)
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const sx = useSpring(tx, { stiffness: 160, damping: 16 });
  const sy = useSpring(ty, { stiffness: 160, damping: 16 });
  const onMove = (e) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    tx.set(-((e.clientY - r.top) / r.height - 0.5) * 9);
    ty.set(((e.clientX - r.left) / r.width - 0.5) * 11);
  };
  const onLeave = () => { tx.set(0); ty.set(0); };

  const desc = lang === "ar" ? project.description_ar || project.description_en : project.description_en || project.description_ar;
  const size = formatSize(project.zipSize);

  return (
    <div ref={ref} style={{ perspective: 900 }}>
      <motion.article
        style={{ y, opacity, rotateX: rotX }}
        className="preserve-3d"
      >
        <motion.div
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          style={{ rotateX: sx, rotateY: sy, boxShadow: `7px 7px 0 ${accent}` }}
          whileHover={{ x: -2, y: -2 }}
          className="group relative rounded-[26px] bg-plum border-2 border-haze overflow-hidden flex flex-col transition-shadow"
        >
          <button
            onClick={() => onSelect(project)}
            className="relative block aspect-[16/10] w-full overflow-hidden bg-ink text-start"
            aria-label={project.title}
          >
            {!loaded && <div className="absolute inset-0 bg-haze/60 animate-pulse" />}
            <motion.img
              src={project.imageUrl}
              alt={project.title}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              style={{ y: imgY, scale: 1.2 }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
            {project.featured && (
              <span className="absolute top-3 start-3 h-7 px-3 rounded-full bg-sun text-ink text-xs font-semibold flex items-center">
                {lang === "ar" ? "مختار" : "Selected"}
              </span>
            )}
          </button>

          <div className="p-5 flex-1 flex flex-col gap-3">
            <div>
              <button onClick={() => onSelect(project)} className="text-start">
                <h3 className="font-display text-2xl leading-tight line-clamp-1">{project.title}</h3>
              </button>
              <p className="mt-1.5 text-sm text-bone/65 leading-7 line-clamp-2 min-h-[3.5rem]">{desc}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(project.tags || []).slice(0, 3).map((t) => (
                <span key={t} className="h-6 px-2.5 rounded-full bg-ink text-xs text-bone/75 flex items-center">{t}</span>
              ))}
              {(size || project.downloads > 0) && (
                <span className="ms-auto text-xs text-bone/45 tabular-nums flex items-center gap-1">
                  <FileArchive className="w-3.5 h-3.5" />
                  {[size, project.downloads > 0 ? `${project.downloads}↓` : ""].filter(Boolean).join("  ")}
                </span>
              )}
            </div>

            <div className="mt-auto flex items-center gap-2 pt-1">
              <a
                href={project.zipUrl}
                download
                target="_blank"
                rel="noreferrer"
                onClick={() => onDownload(project)}
                className="flex-1 h-12 rounded-2xl bg-sun text-ink font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Download className="w-4 h-4" />
                {lang === "ar" ? "حمّل الكود" : "Download ZIP"}
              </a>
              {project.instaUrl && (
                <a
                  href={project.instaUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={lang === "ar" ? "الفيديو على إنستغرام" : "Watch on Instagram"}
                  className="h-12 w-12 rounded-2xl bg-ink text-bone flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.article>
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-[26px] bg-plum border-2 border-haze overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-haze/50" />
      <div className="p-5 space-y-3">
        <div className="h-6 w-2/3 rounded bg-haze/60" />
        <div className="h-4 w-full rounded bg-haze/40" />
        <div className="h-4 w-4/5 rounded bg-haze/40" />
        <div className="h-12 rounded-2xl bg-haze/60 mt-4" />
      </div>
    </div>
  );
}
