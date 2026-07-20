import { useEffect, useState } from "react";
import { BarChart3, Copy } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { apiQualitySummary } from "@renderer/lib/api";
import { productUnderstandingCompact } from "@shared/productUnderstandingPolicy";

export function QualityDashboardSection() {
  const settings = useApp((s) => s.settings);
  const authEnabled = useApp((s) => s.auth.authEnabled);
  const graph = useApp((s) => s.marketingProfile?.product_understanding);
  const [data, setData] = useState<Awaited<ReturnType<typeof apiQualitySummary>> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void apiQualitySummary(settings, authEnabled, 30)
      .then(setData)
      .catch(() => setData(null));
  }, [settings, authEnabled]);

  if (!data) {
    return (
      <div className="space-y-4" data-testid="quality-dashboard">
        {graph && (
          <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-label text-text">Product understanding graph</div>
                <div className="text-micro text-text-3">
                  {graph.claims.length} claims · computed {new Date(graph.computed_at).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 hover:bg-surface"
                onClick={() => {
                  void navigator.clipboard.writeText(productUnderstandingCompact(graph));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
              >
                <Copy size={12} />
                {copied ? "Copied" : "Copy JSON"}
              </button>
            </div>
          </div>
        )}
        <p className="text-body-sm text-text-2">
          Rate decisions with thumbs in the agent thread — aggregates appear here after feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="quality-dashboard">
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
        <BarChart3 size={18} className="text-accent" />
        <div>
          <div className="text-label text-text">30-day quality score</div>
          <div className="text-h3 text-text">
            {data.totals.score !== null ? `${data.totals.score}%` : "—"}
          </div>
          <div className="text-micro text-text-3">
            {data.totals.up} up · {data.totals.down} down · {data.totals.total} ratings
          </div>
        </div>
      </div>
      {data.bySkill.length > 0 && (
        <ul className="space-y-2">
          {data.bySkill.slice(0, 8).map((row) => (
            <li
              key={`${row.skill_id ?? ""}-${row.discipline ?? ""}`}
              className="flex items-center justify-between rounded-[var(--radius-sm)] border border-line px-3 py-2 text-body-sm"
            >
              <span className="text-text-2">
                {row.skill_id ?? row.discipline ?? "General"}
              </span>
              <span className="font-mono text-micro text-text">
                {row.score}% ({row.total})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
