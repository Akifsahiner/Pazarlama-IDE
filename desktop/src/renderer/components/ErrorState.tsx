import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
  className?: string;
}

/** Structured, semantic error surface — replaces inline `[error: ...]` strings. */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  onSecondary,
  secondaryLabel,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 px-4 py-3 ${className}`}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <div className="text-body-sm font-medium text-text">{title}</div>
        <p className="mt-1 text-body-sm leading-relaxed text-text-2 break-words">{message}</p>
        {(onRetry || onSecondary) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="app-no-drag inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
              >
                <RefreshCw size={12} /> {retryLabel}
              </button>
            )}
            {onSecondary && secondaryLabel && (
              <button
                onClick={onSecondary}
                className="app-no-drag inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useApp } from "@renderer/state/store";
import { presentError } from "@renderer/lib/errorPresenter";

/**
 * Compact inline danger row (e.g. inside a thread). Raw errors pass through
 * the presenter so users see a next step, never a stack trace.
 */
export function ErrorRow({ message }: { message: string }) {
  const navigate = useApp((s) => s.navigate);
  const presented = presentError(message);

  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-danger/25 bg-danger/[0.08] px-3 py-2 text-body-sm text-danger">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1 break-words text-danger/90">
        {presented.message}
        {presented.action && presented.action.kind !== "retry" && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => navigate("settings")}
              className="underline underline-offset-2 hover:opacity-80"
            >
              {presented.action.label}
            </button>
          </>
        )}
      </span>
    </div>
  );
}
