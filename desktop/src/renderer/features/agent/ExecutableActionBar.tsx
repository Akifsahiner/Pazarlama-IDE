import type { ExecutableAction } from "@shared/executableAction";
import { actionButtonLabel, executableActionToIntent } from "@shared/executableAction";
import { useApp } from "@renderer/state/store";

export function ExecutableActionBar({ actions }: { actions: ExecutableAction[] }) {
  const executeIntent = useApp((s) => s.executeIntent);
  if (!actions.length) return null;

  return (
    <div className="max-w-[96%] flex flex-wrap gap-2">
      {actions.map((action, i) => {
        const intent = executableActionToIntent(action);
        if (!intent) return null;
        const primary = i === 0;
        return (
          <button
            key={`${action.kind}-${i}`}
            type="button"
            onClick={() => void executeIntent(intent)}
            className={
              primary
                ? "rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-mini font-medium text-on-accent hover:opacity-90"
                : "rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-mini text-text-2 hover:bg-elevated"
            }
          >
            {actionButtonLabel(action)}
          </button>
        );
      })}
    </div>
  );
}
