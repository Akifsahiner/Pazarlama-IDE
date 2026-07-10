import { cx } from "./cx";

/** Keyboard shortcut chip — used in menus, palette rows, and help. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line bg-surface-2 px-1 font-mono text-[10px] leading-none text-text-3",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
