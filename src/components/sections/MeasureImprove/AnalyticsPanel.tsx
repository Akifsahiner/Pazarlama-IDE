import { Lightbulb } from "lucide-react";
import { sections } from "@/lib/tokens";

export function AnalyticsPanel() {
  const { channels, insight } = sections.measure;
  const maxVisits = Math.max(...channels.map((c) => c.visits));

  return (
    <div className="card-elevated card-hover p-6 md:p-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink">Channel attribution</h4>
          <span className="font-mono text-[10px] text-ink-3">last 7 days</span>
        </div>

        <div className="flex flex-col gap-3.5">
          {channels.map((channel) => {
            const rate = ((channel.signups / channel.visits) * 100).toFixed(1);
            return (
              <div key={channel.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{channel.name}</span>
                  <span className="text-ink-3">
                    {channel.visits} visits · <span className="font-medium text-green">{rate}%</span> signup
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-blue"
                    style={{ width: `${(channel.visits / maxVisits) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-3">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-orange" />
          <p className="text-xs leading-relaxed text-ink-2">{insight}</p>
        </div>
      </div>
    </div>
  );
}
