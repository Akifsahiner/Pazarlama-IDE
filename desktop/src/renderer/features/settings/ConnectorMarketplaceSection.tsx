import { useEffect, useState } from "react";
import { Plug, RefreshCw } from "lucide-react";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { useApp } from "@renderer/state/store";
import {
  apiConnectorCatalog as apiConnectorCatalogRaw,
  apiStartConnectorConnect as apiStartConnectorConnectRaw,
  apiSyncConnector as apiSyncConnectorRaw,
  type ConnectorCatalogEntry,
} from "@renderer/lib/api";

const CONNECT_LABEL: Record<string, string> = {
  ga4: "Connect GA4",
  meta: "Connect Meta",
  linkedin: "Connect LinkedIn",
  hubspot: "Connect HubSpot",
};

export function ConnectorMarketplaceSection() {
  const project = useApp((s) => s.project);
  const serverProjectId = useApp((s) => s.activeProjectId);
  const settings = useApp((s) => s.settings);
  const authEnabled = useApp((s) => s.auth.authEnabled);
  const connectGa4 = useApp((s) => s.connectGa4);
  const syncGa4Metrics = useApp((s) => s.syncGa4Metrics);
  const connectorStatus = useApp((s) => s.marketingProfile);
  const [catalog, setCatalog] = useState<ConnectorCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const projectId = serverProjectId ?? project?.id;

  useEffect(() => {
    void apiConnectorCatalogRaw(settings, authEnabled)
      .then((r) => setCatalog(r.connectors))
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, [settings, authEnabled]);

  const statusFor = (id: string): string => {
    if (id === "ga4" && connectorStatus?.ga4_oauth?.refresh_token) return "connected";
    if (id === "meta" && connectorStatus?.meta_oauth?.access_token) return "connected";
    if (id === "linkedin" && connectorStatus?.linkedin_oauth?.access_token) return "connected";
    if (id === "hubspot" && connectorStatus?.hubspot_oauth?.access_token) return "connected";
    return "disconnected";
  };

  const connect = async (id: string) => {
    if (!projectId) return;
    if (id === "ga4") {
      void connectGa4();
      return;
    }
    const res = await apiStartConnectorConnectRaw(settings, authEnabled, id, projectId);
    if (res.authUrl) window.open(res.authUrl, "_blank", "noopener,noreferrer");
  };

  const sync = async (id: string) => {
    if (id === "ga4") void syncGa4Metrics();
    else if (projectId) {
      void apiSyncConnectorRaw(settings, authEnabled, id, projectId);
    }
  };

  if (loading) {
    return <p className="text-body-sm text-text-2">Loading connector catalog…</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2" data-testid="connector-marketplace">
      {catalog.map((c) => {
        const st = statusFor(c.id);
        return (
          <div
            key={c.id}
            className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Plug size={14} className="text-accent" />
                <span className="text-label text-text">{c.name}</span>
              </div>
              <Badge tone={st === "connected" ? "ok" : c.envConfigured ? "neutral" : "warn"}>
                {st === "connected" ? "Connected" : c.envConfigured ? "Available" : "Not configured"}
              </Badge>
            </div>
            <p className="mb-3 text-caption text-text-2">{c.description}</p>
            <p className="mb-3 text-micro text-text-3">{c.setupHint}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!c.envConfigured || !projectId}
                onClick={() => void connect(c.id)}
              >
                {CONNECT_LABEL[c.id] ?? "Connect"}
              </Button>
              {st === "connected" && (c.id === "ga4" || c.id === "meta") && (
                <Button size="sm" variant="ghost" onClick={() => void sync(c.id)}>
                  <RefreshCw size={12} /> Sync
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
