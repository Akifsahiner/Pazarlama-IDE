import { Lightbulb } from "lucide-react";
import { sections } from "@/lib/tokens";

export function AnalyticsPanel() {
  const { channels, insight } = sections.measure;
  const maxVisits = Math.max(...channels.map((c) => c.visits));

  return (
    <div className="surface-card p-6 md:p-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#1A202C]">Channel attribution</h4>
          <span className="font-mono text-[10px] text-ink-muted">last 7 days</span>
        </div>

        <div className="flex flex-col gap-3.5">
          {channels.map((channel) => {
            const rate = ((channel.signups / channel.visits) * 100).toFixed(1);
            return (
              <div key={channel.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1A202C]">{channel.name}</span>
                  <span className="text-ink-muted">
                    {channel.visits} visits · {rate}% signup
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--accent-blue-bg)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-blue-border)]"
                    style={{ width: `${(channel.visits / maxVisits) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-[var(--accent-green-bg)] p-3">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-[var(--accent-green)]" />
          <p className="text-xs leading-relaxed text-[var(--accent-green)]">{insight}</p>
        </div>
      </div>
    </div>
  );
}
