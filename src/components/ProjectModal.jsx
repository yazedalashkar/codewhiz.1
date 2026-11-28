import { useState, useEffect } from "react";
import { Download, Instagram, Link2, Check, FileArchive } from "lucide-react";
import Sheet from "./Sheet";
import { formatSize } from "../lib/format";

export default function ProjectModal({ project, lang, onClose, onDownload }) {
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setLoaded(false); setCopied(false); }, [project?.id]);

  const share = async () => {
    const url = `${location.origin}/?p=${project.id}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: project.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch { /* user cancelled */ }
  };

  const p = project;
  const size = p ? formatSize(p.zipSize) : "";

  return (
    <Sheet open={Boolean(p)} onClose={onClose} label={p?.title}>
      {p && (
        <>
          <div className="relative aspect-[16/9] bg-ink -mt-9 md:mt-0">
            {!loaded && <div className="absolute inset-0 bg-haze/60 animate-pulse" />}
            <img
              src={p.imageUrl}
              alt={p.title}
              onLoad={() => setLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          </div>

          <div className="p-5 md:p-6 space-y-4">
            <div>
              <h2 className="font-display text-3xl leading-tight">{p.title}</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(p.tags || []).map((t) => (
                  <span key={t} className="h-7 px-3 rounded-full bg-ink text-xs text-bone/80 flex items-center">{t}</span>
                ))}
              </div>
            </div>

            <p className="text-base text-bone/80 leading-8">
              {lang === "ar" ? p.description_ar || p.description_en : p.description_en || p.description_ar}
            </p>

            {(size || p.downloads > 0) && (
              <p className="text-sm text-bone/50 flex items-center gap-2 tabular-nums">
                <FileArchive className="w-4 h-4" />
                {[size && `ZIP ${size}`, p.downloads > 0 && `${p.downloads} ${lang === "ar" ? "تحميل" : "downloads"}`].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="grid grid-cols-[1fr_auto_auto] gap-2 pt-1">
              <a
                href={p.zipUrl}
                download
                target="_blank"
                rel="noreferrer"
                onClick={() => onDownload(p)}
                className="h-14 rounded-2xl bg-sun text-ink font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Download className="w-5 h-5" />
                {lang === "ar" ? "حمّل الكود (ZIP)" : "Download source (ZIP)"}
              </a>
              {p.instaUrl ? (
                <a
                  href={p.instaUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="h-14 w-14 rounded-2xl bg-ink text-bone flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              ) : <span />}
              <button
                onClick={share}
                aria-label={lang === "ar" ? "مشاركة الرابط" : "Share link"}
                className="h-14 w-14 rounded-2xl bg-ink text-bone flex items-center justify-center active:scale-95 transition-transform"
              >
                {copied ? <Check className="w-5 h-5 text-sun" /> : <Link2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
