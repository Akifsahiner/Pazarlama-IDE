import { useState } from "react";
import { Button } from "@renderer/components/ui/Button";
import { useApp } from "@renderer/state/store";
import type { SocialImportPlatform } from "@shared/socialMetricsImport";

export function SocialMetricsImportPanel() {
  const importSocialMetrics = useApp((s) => s.importSocialMetrics);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const [raw, setRaw] = useState("");
  const [platform, setPlatform] = useState<SocialImportPlatform>("generic");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleImport = () => {
    setError(null);
    setSuccess(null);
    const err = importSocialMetrics(raw, platform, opsCadence?.day_index ?? 3);
    if (err) {
      setError(err);
      return;
    }
    setSuccess("Metrics imported to manual KPIs.");
    setRaw("");
  };

  return (
    <div
      className="rounded-[var(--radius-md)] border border-line bg-surface-2/30 p-3"
      data-testid="social-metrics-import-panel"
    >
      <div className="text-mini font-semibold uppercase tracking-wide text-text-3">
        Paste platform analytics
      </div>
      <p className="mt-1 text-mini text-text-3">
        TikTok CSV, Reels JSON, or generic CSV (views, retention columns).
      </p>
      <select
        value={platform}
        onChange={(e) => setPlatform(e.target.value as SocialImportPlatform)}
        className="mt-2 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1 text-mini"
        data-testid="social-import-platform"
      >
        <option value="generic">Generic CSV</option>
        <option value="tiktok">TikTok CSV</option>
        <option value="reels">Reels JSON / CSV</option>
      </select>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Paste CSV or JSON…"
        rows={4}
        className="mt-2 w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 font-mono text-mini"
        data-testid="social-import-paste"
      />
      <Button size="sm" variant="secondary" className="mt-2" onClick={handleImport}>
        Import metrics
      </Button>
      {error && <p className="mt-2 text-mini text-warn">{error}</p>}
      {success && <p className="mt-2 text-mini text-ok">{success}</p>}
    </div>
  );
}
