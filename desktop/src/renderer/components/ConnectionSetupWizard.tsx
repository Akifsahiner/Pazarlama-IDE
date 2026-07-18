import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2, Server, Sparkles, BarChart3 } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { isSelfHostServerUrl, normalizeDevServerUrl } from "@shared/defaults";
import { buildSetupChecklist, type SetupChecklistStatus } from "@shared/runtimeCapability";
import { Field, Input } from "@renderer/components/ui/Field";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";
import { Badge } from "@renderer/components/ui/Badge";
import { BundledLocalServerCard } from "@renderer/components/BundledLocalServerCard";

function statusTone(status: SetupChecklistStatus): "ok" | "warn" | "neutral" {
  if (status === "ok") return "ok";
  if (status === "error" || status === "unavailable") return "warn";
  return "neutral";
}

function WizardStep({
  done,
  active,
  error,
  label,
  detail,
}: {
  done: boolean;
  active: boolean;
  error?: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 text-mini">
        {done ? (
          <CheckCircle2 size={14} className="text-ok" />
        ) : active ? (
          <Loader2 size={14} className="animate-spin text-accent" />
        ) : error ? (
          <Circle size={14} className="text-warn" />
        ) : (
          <Circle size={14} className="text-text-3" />
        )}
        <span className={done ? "text-text-2" : active ? "text-text" : error ? "text-warn" : "text-text-3"}>
          {label}
        </span>
      </div>
      {detail && <p className="pl-[22px] text-[10px] text-text-3">{detail}</p>}
    </div>
  );
}

export interface ConnectionSetupWizardProps {
  /** Show server URL field on step 1 (onboarding). Settings may hide if URL already set. */
  showServerField?: boolean;
  /** Offline escape hatch */
  onContinueOffline?: () => void;
  compact?: boolean;
}

/**
 * 3-step setup: server URL → healthz test → capability check (Anthropic + GA4 OAuth).
 * Copy: conversational marketing needs connection — files stay on your machine.
 */
export function ConnectionSetupWizard({
  showServerField = true,
  onContinueOffline,
  compact = false,
}: ConnectionSetupWizardProps) {
  const settings = useApp((s) => s.settings);
  const connection = useApp((s) => s.connection);
  const runtime = useApp((s) => s.runtime);
  const updateSettings = useApp((s) => s.updateSettings);
  const checkConnection = useApp((s) => s.checkConnection);
  const normalizedUrl = normalizeDevServerUrl(settings.serverUrl);
  const [serverDraft, setServerDraft] = useState(normalizedUrl);
  const [testing, setTesting] = useState(false);
  const [urlSaved, setUrlSaved] = useState(
    !showServerField || normalizedUrl === settings.serverUrl.trim().replace(/\/$/, ""),
  );
  const [savingUrl, setSavingUrl] = useState(false);
  const portHint =
    isSelfHostServerUrl(serverDraft) && serverDraft.includes(":8799")
      ? "Port 8799 is outdated — use 8787 (npm run dev in /server)."
      : undefined;

  const checklist = buildSetupChecklist({
    connectionState: connection.state,
    providers: connection.providers,
    connectors: connection.connectors,
  });

  const connected = runtime === "connected";
  const step1Done = urlSaved || !showServerField;
  const step2Done = checklist.server === "ok";
  const step3Done = connected && checklist.anthropic === "ok";

  useEffect(() => {
    if (!showServerField) return;
    const fixed = normalizeDevServerUrl(settings.serverUrl);
    if (fixed !== settings.serverUrl) {
      void updateSettings({ serverUrl: fixed });
      setServerDraft(fixed);
      setUrlSaved(true);
    }
  }, [showServerField, settings.serverUrl, updateSettings]);

  useEffect(() => {
    if (!connected && connection.state !== "checking" && urlSaved) {
      void checkConnection();
    }
  }, [urlSaved]);

  const runTest = async () => {
    setTesting(true);
    try {
      await checkConnection();
    } finally {
      setTesting(false);
    }
  };

  const saveUrlAndTest = async () => {
    const trimmed = normalizeDevServerUrl(serverDraft);
    if (!trimmed) return;
    setSavingUrl(true);
    try {
      await updateSettings({ serverUrl: trimmed });
      setServerDraft(trimmed);
      setUrlSaved(true);
      await runTest();
    } finally {
      setSavingUrl(false);
    }
  };

  const ga4Detail =
    checklist.ga4 === "ok"
      ? "GA4 OAuth configured — optional read-only metrics."
      : "GA4 OAuth not on this server — log KPIs manually until configured.";

  return (
    <div className="space-y-4">
      <BundledLocalServerCard prominent />

      <Card className="space-y-3">
        <div>
          <div className="text-caption font-medium uppercase tracking-wide text-text-3">
            Connection setup wizard
          </div>
          <p className="mt-1 text-body-sm text-text-2">
            Talk-through marketing needs a backend connection — your project files never leave this device.
            After this (or skip), you choose which project to open: local folder, git repo, or live URL.
          </p>
        </div>

        <WizardStep
          done={step1Done}
          active={savingUrl}
          label="Step 1 — Backend server URL"
          detail={
            showServerField
              ? isSelfHostServerUrl(serverDraft)
                ? "Local dev default — start server with npm run dev in /server"
                : "Hosted API URL for sign-in builds"
              : undefined
          }
        />

        {showServerField && !step1Done && (
          <Field label="Server URL" error={portHint}>
            <div className="flex gap-2">
              <Input
                type="url"
                value={serverDraft}
                onChange={(e) => setServerDraft(e.target.value)}
                placeholder="http://127.0.0.1:8787"
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={savingUrl || !serverDraft.trim()}
                onClick={() => void saveUrlAndTest()}
              >
                {savingUrl ? "Saving…" : "Save & test"}
              </Button>
            </div>
          </Field>
        )}

        <WizardStep
          done={step2Done}
          active={step1Done && !step2Done && (testing || connection.state === "checking")}
          error={checklist.server === "error"}
          label="Step 2 — Test connection (GET /healthz)"
          detail={
            checklist.server === "error"
              ? "Cannot reach backend — check URL and that the server is running."
              : step2Done
                ? "Backend reachable."
                : undefined
          }
        />

        <WizardStep
          done={step3Done}
          active={step2Done && !step3Done}
          error={step2Done && checklist.anthropic === "unavailable"}
          label="Step 3 — AI capabilities (Claude + optional GA4)"
          detail={
            step2Done
              ? checklist.anthropic === "ok"
                ? ga4Detail
                : "Anthropic not configured on server — add ANTHROPIC_API_KEY to server/.env"
              : undefined
          }
        />

        {step2Done && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge tone={statusTone(checklist.anthropic)}>
              <Sparkles size={10} className="mr-1 inline" />
              Claude {checklist.anthropic === "ok" ? "ready" : "unavailable"}
            </Badge>
            <Badge tone={statusTone(checklist.ga4)}>
              <BarChart3 size={10} className="mr-1 inline" />
              GA4 OAuth {checklist.ga4 === "ok" ? "available" : "optional"}
            </Badge>
          </div>
        )}
      </Card>

      {!compact && (
        <Card className="flex items-center gap-3">
          {connection.state === "checking" || testing ? (
            <Loader2 size={18} className="animate-spin text-accent" />
          ) : connected ? (
            <CheckCircle2 size={18} className="text-ok" />
          ) : (
            <Server size={18} className="text-warn" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-body font-medium text-text">
              {connected ? "Ready — generate AI plans and run the agent" : "Not ready for full AI yet"}
            </div>
            <p className="text-body-sm text-text-2">
              {connected
                ? "Ask, Edit, Browse, and Plan Studio are unlocked."
                : "Scan and preview outline still work offline."}
            </p>
          </div>
          {!connected && step1Done && (
            <Button variant="secondary" size="sm" disabled={testing} onClick={() => void runTest()}>
              {testing ? "Testing…" : "Retest"}
            </Button>
          )}
        </Card>
      )}

      {onContinueOffline && (
        <Button variant="secondary" className="w-full" onClick={onContinueOffline}>
          Skip connection — choose project next (offline preview)
        </Button>
      )}
    </div>
  );
}
