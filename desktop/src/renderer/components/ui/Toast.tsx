import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { spring } from "@renderer/design/animations";
import { IconButton } from "./IconButton";
import { cx } from "./cx";

export type ToastTone = "info" | "success" | "warn" | "danger";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss in ms; 0 = sticky. */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastApi {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const TONE_STYLES: Record<ToastTone, { border: string; icon: React.ReactNode }> = {
  info: { border: "border-accent-border", icon: <Info size={14} className="text-accent" /> },
  success: { border: "border-ok-border", icon: <Check size={14} className="text-ok" /> },
  warn: { border: "border-warn-border", icon: <AlertTriangle size={14} className="text-warn" /> },
  danger: { border: "border-danger-border", icon: <AlertTriangle size={14} className="text-danger" /> },
};

/** App-level toast provider + viewport (bottom-right, `--z-toast`). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { ...input, id }]);
      const duration = input.duration ?? 4200;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-10 right-4 z-[var(--z-toast)] flex w-80 flex-col gap-2">
        <AnimatePresence>
          {items.map((t) => {
            const tone = TONE_STYLES[t.tone ?? "info"];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
                exit={{ opacity: 0, x: 24 }}
                className={cx(
                  "pointer-events-auto flex items-start gap-2.5 rounded-[var(--radius-md)] border bg-elevated p-3 shadow-[var(--shadow-2)]",
                  tone.border,
                )}
              >
                <span className="mt-0.5 shrink-0">{tone.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-label text-text">{t.title}</div>
                  {t.description && <div className="mt-0.5 text-caption text-text-2">{t.description}</div>}
                </div>
                <IconButton label="Dismiss" size="sm" onClick={() => dismiss(t.id)}>
                  <X size={12} />
                </IconButton>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
