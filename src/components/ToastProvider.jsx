import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    accent: "text-emerald-400",
    bar: "bg-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-[#121614]/95",
  },
  error: {
    icon: AlertCircle,
    accent: "text-rose-400",
    bar: "bg-rose-400",
    border: "border-rose-500/35",
    bg: "bg-[#181112]/95",
  },
  warning: {
    icon: AlertTriangle,
    accent: "text-amber-400",
    bar: "bg-amber-400",
    border: "border-amber-500/35",
    bg: "bg-[#181510]/95",
  },
  info: {
    icon: Info,
    accent: "text-[#E85D2A]",
    bar: "bg-[#E85D2A]",
    border: "border-[#E85D2A]/30",
    bg: "bg-[#141312]/95",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    ({ type = "info", title, detail = "", duration = 4500 }) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => {
        // Keep max 3 active toasts so mobile viewport is never cluttered
        const next = [...prev, { id, type, title, detail, duration }];
        return next.slice(-3);
      });

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, detail, duration = 4000) =>
        push({ type: "success", title, detail, duration }),
      error: (title, detail, duration = 6000) =>
        push({ type: "error", title, detail, duration }),
      warning: (title, detail, duration = 5000) =>
        push({ type: "warning", title, detail, duration }),
      info: (title, detail, duration = 3600) =>
        push({ type: "info", title, detail, duration }),
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="true"
            className="fixed inset-x-0 top-0 sm:top-auto sm:bottom-5 sm:inset-x-auto sm:end-5 z-[9999] pointer-events-none flex flex-col items-center sm:items-end gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-0"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {toasts.map((t) => {
                const cfg = TOAST_STYLES[t.type] || TOAST_STYLES.info;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: -22, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.95 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    drag="y"
                    dragConstraints={{ top: -80, bottom: 10 }}
                    dragElastic={0.25}
                    onDragEnd={(_, info) => {
                      if (info.offset.y < -28 || info.velocity.y < -200) {
                        dismiss(t.id);
                      }
                    }}
                    role="status"
                    className={`pointer-events-auto relative w-full max-w-[360px] rounded-2xl border ${cfg.border} ${cfg.bg} backdrop-blur-xl shadow-[0_18px_45px_-12px_rgba(0,0,0,0.75)] overflow-hidden`}
                  >
                    <div className="p-3.5 flex items-start gap-3">
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.accent}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#F5F3EE] leading-snug">
                          {t.title}
                        </p>
                        {t.detail && (
                          <p className="text-[11px] text-[#A8A59E] leading-relaxed mt-0.5 break-words">
                            {t.detail}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => dismiss(t.id)}
                        aria-label="Dismiss notification"
                        className="p-1.5 -m-1 rounded-lg text-[#8A8780] hover:text-[#F5F3EE] hover:bg-white/5 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {t.duration > 0 && (
                      <motion.div
                        initial={{ scaleX: 1 }}
                        animate={{ scaleX: 0 }}
                        transition={{ duration: t.duration / 1000, ease: "linear" }}
                        style={{ transformOrigin: "left" }}
                        className={`h-[2px] w-full ${cfg.bar} opacity-75`}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => {},
      dismiss: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    };
  }
  return ctx;
}
