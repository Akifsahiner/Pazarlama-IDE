import type { LucideIcon } from "lucide-react";
import { Button } from "./ui/Button";

interface Action {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  children?: React.ReactNode;
  className?: string;
}

/** Calm, centered placeholder for "nothing here yet" surfaces (v2). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 text-center ${className}`}>
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] border border-line bg-gradient-to-b from-surface-2 to-surface text-text-3 shadow-[var(--shadow-1)]">
          <Icon size={24} />
        </div>
      )}
      <h3 className="text-h3 text-text">{title}</h3>
      {description && <p className="mt-2 max-w-md text-body text-text-2">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex items-center gap-2">
          {primaryAction && (
            <Button
              variant="primary"
              onClick={primaryAction.onClick}
              iconLeft={primaryAction.icon ? <primaryAction.icon size={15} /> : undefined}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              iconLeft={secondaryAction.icon ? <secondaryAction.icon size={15} /> : undefined}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {children && <div className="mt-5 flex flex-col items-center gap-3">{children}</div>}
    </div>
  );
}
