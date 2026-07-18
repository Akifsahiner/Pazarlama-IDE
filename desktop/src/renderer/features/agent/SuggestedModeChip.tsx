import { PenLine, X } from "lucide-react";
import { useApp } from "@renderer/state/store";

export function SuggestedModeChip() {
  const suggested = useApp((s) => s.suggestedComposerMode);
  const clearSuggested = useApp((s) => s.clearSuggestedComposerMode);
  const setComposerMode = useApp((s) => s.setComposerMode);
  const workspaceHandoff = useApp((s) => s.workspaceHandoff);
  const dismissHandoff = useApp((s) => s.dismissWorkspaceHandoff);
  const executeIntent = useApp((s) => s.executeIntent);

  if (!suggested && !workspaceHandoff) return null;

  const mode = suggested?.mode ?? "edit";
  const reason = suggested?.reason ?? workspaceHandoff?.reason;

  const runHandoff = () => {
    const intent = workspaceHandoff?.payload?.intent;
    if (intent) void executeIntent(intent);
    dismissHandoff();
  };

  return (
    <div className="mb-2 flex items-center gap-2 rounded-[var(--radius-md)] border border-accent/35 bg-accent-soft/20 px-3 py-2">
      <PenLine size={14} className="shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-mini font-medium text-text">
          Brain suggests {mode === "edit" ? "Edit project" : mode === "browse" ? "Browse" : mode}
        </p>
        {reason && <p className="truncate text-[10px] text-text-3">{reason}</p>}
      </div>
      {workspaceHandoff?.primaryAction === "execute_intent" && (
        <button
          type="button"
          onClick={runHandoff}
          className="shrink-0 rounded-[var(--radius-sm)] bg-accent px-2.5 py-1 text-[10px] font-medium text-on-accent"
        >
          {workspaceHandoff.primaryLabel}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss suggestion"
        onClick={() => {
          clearSuggested();
          dismissHandoff();
        }}
        className="shrink-0 text-text-3 hover:text-text"
      >
        <X size={14} />
      </button>
      {!workspaceHandoff && (
        <button
          type="button"
          onClick={() => setComposerMode(mode)}
          className="shrink-0 text-[10px] text-accent hover:underline"
        >
          Switch mode
        </button>
      )}
    </div>
  );
}
