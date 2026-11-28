import { useEffect } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

/** Desktop: centered dialog. Phone: bottom sheet you can drag down to dismiss. */
export default function Sheet({ open, onClose, children, maxWidth = "max-w-lg", label = "dialog" }) {
  const controls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.42, ease: EASE }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className={`relative w-full ${maxWidth} max-h-[92dvh] overflow-y-auto overscroll-contain bg-plum border-2 border-haze rounded-t-[28px] md:rounded-[28px] pb-safe md:pb-0`}
          >
            {/* drag handle: phones only */}
            <div
              className="md:hidden sticky top-0 z-20 flex justify-center pt-2.5 pb-1.5 cursor-grab touch-none"
              onPointerDown={(e) => controls.start(e)}
            >
              <span className="h-1.5 w-12 rounded-full bg-haze" />
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 end-3 z-30 h-10 w-10 rounded-full bg-ink/80 border-2 border-haze text-bone flex items-center justify-center active:scale-95 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
