import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { palettePop } from "@renderer/design/animations";
import { cx } from "./cx";

export interface MenuItemDef {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
  onSelect: () => void;
}

export interface MenuProps {
  /** Render prop for the trigger; receives open state + toggle. */
  trigger: (opts: { open: boolean; toggle: () => void }) => React.ReactNode;
  items: MenuItemDef[];
  align?: "left" | "right";
  /** Open direction; "top" for triggers near the bottom edge. */
  side?: "bottom" | "top";
  className?: string;
}

/**
 * Dropdown menu with click-outside + Escape dismissal and arrow-key focus.
 * Replaces bespoke dropdowns (ProjectSwitcher, overflow menus).
 */
export function Menu({ trigger, items, align = "right", side = "bottom", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onKeyNav = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const nodes = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? []);
    if (nodes.length === 0) return;
    const idx = nodes.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? nodes[(idx + 1) % nodes.length] : nodes[(idx - 1 + nodes.length) % nodes.length];
    next.focus();
  };

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            role="menu"
            variants={palettePop}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onKeyDown={onKeyNav}
            className={cx(
              "absolute z-[var(--z-dropdown)] min-w-44 overflow-hidden rounded-[var(--radius-md)] border border-line bg-elevated py-1 shadow-[var(--shadow-2)]",
              align === "right" ? "right-0" : "left-0",
              side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
            )}
          >
            {items.map((item) => (
              <button
                key={item.id}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                title={item.title}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cx(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-label transition-colors",
                  item.danger ? "text-danger hover:bg-danger-soft" : "text-text-2 hover:bg-surface-2 hover:text-text",
                  item.disabled && "pointer-events-none opacity-50",
                )}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
