import { useEffect, useState } from "react";
import { Server } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";

/** One-click local AI stack — surfaced in Connect onboarding and Settings. */
export function BundledLocalServerCard({ prominent = false }: { prominent?: boolean }) {
  const checkConnection = useApp((s) => s.checkConnection);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ state: string; error?: string } | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(false);

  const refresh = async () => {
    const [st, hasKey] = await Promise.all([
      window.api.bundledServer.status().catch(() => ({ state: "stopped" as const })),
      window.api.bundledServer.hasApiKey().catch(() => false),
    ]);
    setStatus(st);
    setKeyConfigured(hasKey);
  };

  useEffect(() => {
    void window.api.bundledServer.available().then(setAvailable).catch(() => setAvailable(false));
    void refresh();
  }, []);

  if (!available) return null;

  const start = async () => {
    setBusy(true);
    try {
      const result = await window.api.bundledServer.start();
      await refresh();
      if (result.ok) await checkConnection();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className={
        prominent
          ? "space-y-3 border-accent/30 bg-accent-soft/10 ring-1 ring-accent/20"
          : "space-y-3"
      }
      data-testid="bundled-local-server"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-body-sm font-medium text-text">
            <Server size={14} className="text-accent" />
            {prominent ? "Fastest path: start local AI stack" : "Run the bundled local AI server"}
          </div>
          <p className="mt-1 text-caption text-text-2">
            {prominent
              ? "No terminal needed — starts the backend bundled with this install. Add your Anthropic key in Settings if prompted."
              : "Starts the backend on this device — same stack as npm run dev in /server."}
          </p>
          {!keyConfigured && (
            <p className="mt-1 text-micro text-warn">
              Anthropic API key not set yet — you can add it in Settings → Connection after start.
            </p>
          )}
        </div>
        <Button variant={prominent ? "primary" : "secondary"} size="sm" disabled={busy} onClick={() => void start()}>
          {busy ? "Starting…" : "Start local stack"}
        </Button>
      </div>
      {status && (
        <p className="text-caption text-text-3">
          Status:{" "}
          <span
            className={
              status.state === "ready" ? "text-ok" : status.state === "error" ? "text-warn" : "text-text-2"
            }
          >
            {status.state === "ready"
              ? "Running — test connection below"
              : status.state === "error"
                ? `Failed${status.error ? `: ${status.error}` : ""}`
                : status.state}
          </span>
        </p>
      )}
    </Card>
  );
}
