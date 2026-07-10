import { cx } from "./cx";

export interface PageProps {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Constrain content width for readability (default true). */
  contained?: boolean;
}

/** Standard scaffold for full-page destinations (Home/Runs/Assets/Settings). */
export function Page({ title, eyebrow, actions, children, className, contained = true }: PageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-end justify-between gap-4 border-b border-line px-8 py-5">
        <div className="min-w-0">
          {eyebrow && <div className="text-caption uppercase tracking-wide text-text-3">{eyebrow}</div>}
          <h1 className="text-h1 text-text">{title}</h1>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div className={cx(contained && "mx-auto max-w-5xl", className)}>{children}</div>
      </div>
    </div>
  );
}
