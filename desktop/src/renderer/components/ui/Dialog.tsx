import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { overlayFade, palettePop } from "@renderer/design/animations";
import { IconButton } from "./IconButton";
import { cx } from "./cx";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Max width utility class, e.g. "max-w-lg". */
  width?: string;
  /** Hide the built-in header (title + close). */
  bare?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared modal primitive: overlay + centered panel, focus trap, Escape/overlay
 * close, `--z-modal` stacking. All app modals must build on this.
 */
export function Dialog({ open, onClose, title, width = "max-w-lg", bare, children, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    return () => restoreRef.current?.focus?.();
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center overflow-y-auto bg-[var(--overlay)] p-4 pt-[10vh] backdrop-blur-[2px]"
          variants={overlayFade}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            variants={palettePop}
            className={cx(
              "w-full rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-3)] outline-none",
              width,
              className,
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
          >
            {!bare && (
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="text-h3 text-text">{title}</div>
                <IconButton label="Close" onClick={onClose}>
                  <X size={15} />
                </IconButton>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Confirmation dialog helper — destructive actions must use this, not window.confirm. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} width="max-w-sm">
      <div className="p-4">
        {description && <p className="text-body-sm text-text-2">{description}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-line px-3 py-1.5 text-label text-text-2 transition-colors hover:bg-elevated hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cx(
              "rounded-[var(--radius-md)] px-3 py-1.5 text-label font-medium text-white",
              danger ? "bg-danger hover:brightness-110" : "bg-accent hover:bg-[var(--accent-hover)]",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
