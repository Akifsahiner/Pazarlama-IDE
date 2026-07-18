import { useState } from "react";
import { Bell } from "lucide-react";
import { useApp } from "@renderer/state/store";

export function NotificationBell() {
  const items = useApp((s) => s.ideNotifications);
  const dismiss = useApp((s) => s.dismissIdeNotification);
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex items-center gap-1 transition-colors hover:text-text"
        title="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={12} />
        <span className="text-accent">{items.length}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-[var(--radius-md)] border border-line bg-elevated p-2 shadow-lg">
          <div className="mb-1 text-micro font-medium text-text">Background</div>
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {items.slice(0, 8).map((n) => (
              <li key={n.id} className="rounded border border-line/60 bg-surface-2 px-2 py-1.5">
                <div className="text-mini font-medium text-text">{n.title}</div>
                <p className="mt-0.5 text-micro text-text-2">{n.body}</p>
                <button
                  type="button"
                  className="mt-1 text-micro text-accent hover:underline"
                  onClick={() => dismiss(n.id)}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
