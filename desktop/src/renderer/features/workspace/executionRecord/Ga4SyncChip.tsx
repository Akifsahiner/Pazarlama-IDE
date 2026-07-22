import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { hasGa4Connected } from "@shared/cmoProofLoop";
import { useApp } from "@renderer/state/store";

export function Ga4SyncChip({ compact = false }: { compact?: boolean }) {
  const profile = useApp((s) => s.marketingProfile);
  const syncGa4 = useApp((s) => s.syncGa4Metrics);
  const connectGa4 = useApp((s) => s.connectGa4);
  const [syncing, setSyncing] = useState(false);

  const connected = hasGa4Connected(profile);
  const fetchedAt = profile?.connector_snapshots?.ga4?.fetched_at;
  const sessions = profile?.connector_snapshots?.ga4?.metrics?.find((m) => m.name === "sessions")?.value;

  const handleClick = async () => {
    if (!connected) {
      void connectGa4();
      return;
    }
    setSyncing(true);
    try {
      await syncGa4();
    } finally {
      setSyncing(false);
    }
  };

  const label = connected
    ? syncing
      ? "Syncing…"
      : compact
        ? "Pull latest"
        : `Pull latest${sessions != null ? ` · ${sessions} sessions` : ""}`
    : "Connect GA4";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={syncing}
      className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1 text-mini text-text-2 transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-60"
      data-testid="ga4-sync-chip"
      title={fetchedAt ? `Last sync: ${fetchedAt}` : undefined}
    >
      <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
      {label}
    </button>
  );
}
