import { useApp } from "@renderer/state/store";

function Bar({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const warn = pct >= 80;
  return (
    <div className="flex items-center gap-2" title={`${label}: ${used}/${limit}`}>
      <span className="w-10 shrink-0 text-[10px] text-text-3">{label}</span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-elevated">
        <div
          className={`h-full rounded-full ${warn ? "bg-warn" : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function UsageMeter() {
  const auth = useApp((s) => s.auth);
  if (!auth.usage || !auth.quota) return null;

  return (
    <div className="hidden items-center gap-3 md:flex">
      <Bar label="Plan" used={auth.usage.plan} limit={auth.quota.plan_limit} color="bg-accent" />
      <Bar label="Agent" used={auth.usage.agent} limit={auth.quota.agent_limit} color="bg-accent" />
      <Bar
        label="Browser"
        used={auth.usage.browser_min}
        limit={auth.quota.browser_min_limit}
        color="bg-accent"
      />
    </div>
  );
}
