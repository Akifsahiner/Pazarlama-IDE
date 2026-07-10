import { AlertTriangle, ShieldX } from "lucide-react";

export interface SafetyEvent {
  id: string;
  kind: "blocked_site" | "credential_blocked" | "redaction_active";
  detail?: string;
}

const COPY: Record<SafetyEvent["kind"], string> = {
  blocked_site: "Blocked a restricted site",
  credential_blocked: "Blocked typing into a credential field",
  redaction_active: "Sensitive fields redacted",
};

/** Transient safety notices stacked at the bottom of the stage. */
export function SafetyToasts({ events }: { events: SafetyEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 flex-col gap-1.5">
      {events.slice(-3).map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-2 rounded-full border border-warn/40 bg-surface/95 px-3 py-1.5 text-micro text-warn shadow-lg backdrop-blur-sm"
        >
          {e.kind === "credential_blocked" ? <ShieldX size={12} /> : <AlertTriangle size={12} />}
          {COPY[e.kind]}
          {e.detail && <span className="text-text-3">· {e.detail}</span>}
        </div>
      ))}
    </div>
  );
}
