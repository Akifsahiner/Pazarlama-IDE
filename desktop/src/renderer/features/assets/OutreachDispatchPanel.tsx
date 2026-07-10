import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Download,
  Mail,
  Save,
  Send,
  Settings,
} from "lucide-react";
import {
  buildOutreachPack,
  buildMailtoUrl,
  packToWebhookPayload,
} from "@shared/outreachPack";
import { extractLeads, leadsToCsv, draftStatusForAssets } from "@shared/leadExport";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import type { MarketingAsset } from "@shared/types";

export interface OutreachDispatchPanelProps {
  /** Compact bar in workspace vs full panel on Assets page. */
  variant?: "bar" | "panel";
}

type DispatchFeedback = {
  tone: "ok" | "warn" | "error";
  message: string;
  detail?: string;
};

export function OutreachDispatchPanel({ variant = "panel" }: OutreachDispatchPanelProps) {
  const project = useApp((s) => s.project);
  const thread = useApp((s) => s.thread);
  const browser = useApp((s) => s.browser);
  const settings = useApp((s) => s.settings);
  const dispatchOutreachWebhook = useApp((s) => s.dispatchOutreachWebhook);
  const navigate = useApp((s) => s.navigate);
  const toggleSettings = useApp((s) => s.toggleSettings);

  const emailAssets = useMemo(
    () =>
      thread
        .filter((e) => e.kind === "asset" && e.asset?.type === "email")
        .map((e) => e.asset!)
        .filter(Boolean),
    [thread],
  );

  const leads = useMemo(() => {
    const base = extractLeads({ findings: browser.findings, thread });
    return base.map((l) => ({
      ...l,
      draft_status: draftStatusForAssets(emailAssets, l.name),
    }));
  }, [browser.findings, thread, emailAssets]);

  const pack = useMemo(
    () =>
      buildOutreachPack({
        projectName: project?.name ?? "Project",
        thread,
        findings: browser.findings,
        emailAssets,
      }),
    [project?.name, thread, browser.findings, emailAssets],
  );

  const webhookUrl = useApp(
    (s) =>
      s.marketingProfile?.outreach_integrations?.webhook_url ?? s.settings.outreachWebhookUrl,
  );
  const webhookProvider = useApp(
    (s) =>
      s.marketingProfile?.outreach_integrations?.webhook_provider ??
      s.settings.outreachWebhookProvider ??
      "generic",
  );

  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<DispatchFeedback | null>(null);

  const projectRoot = project?.source.kind === "folder" ? project.source.path : undefined;
  const date = new Date().toISOString().slice(0, 10);

  const exportCsv = () => {
    if (leads.length === 0) {
      setFeedback({ tone: "warn", message: "No leads to export — run lead research first." });
      return;
    }
    const csv = leadsToCsv(leads);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${project?.name ?? "export"}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ tone: "ok", message: `Downloaded ${leads.length} leads as CSV.` });
  };

  const copyPack = async () => {
    await navigator.clipboard.writeText(pack.markdown);
    setFeedback({ tone: "ok", message: "Outreach pack copied — paste into your tool or mail client." });
  };

  const savePackToRepo = async () => {
    if (!projectRoot) {
      setFeedback({ tone: "warn", message: "Open a local folder project to save the pack." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const asset: MarketingAsset = {
        id: `pack-${date}`,
        type: "email",
        targetFile: `sales/outreach/pack-${date}.md`,
        after: pack.markdown,
      };
      const result = await window.api.project.applyAsset(asset, projectRoot);
      if (result.applied) {
        setFeedback({
          tone: "ok",
          message: `Saved to ${asset.targetFile}${result.commit ? ` (commit ${result.commit.slice(0, 7)})` : ""}.`,
        });
      } else {
        setFeedback({ tone: "error", message: result.reason ?? "Could not save pack." });
      }
    } catch {
      setFeedback({ tone: "error", message: "Failed to write pack to repo." });
    } finally {
      setBusy(false);
    }
  };

  const openMailto = () => {
    const msg = pack.messages[0];
    const subject = msg?.subject ?? `Intro — ${project?.name ?? "your product"}`;
    const body = msg?.body ?? emailAssets[0]?.after ?? "";
    if (!body.trim()) {
      setFeedback({ tone: "warn", message: "Draft outreach messages first — nothing to open in mail." });
      return;
    }
    window.open(buildMailtoUrl(subject, body), "_blank");
    setFeedback({ tone: "ok", message: "Opened mail client — you send (not auto-sent)." });
  };

  const sendWebhook = async () => {
    setConfirmOpen(false);
    setBusy(true);
    setFeedback(null);
    const result = await dispatchOutreachWebhook();
    setFeedback({
      tone: result.ok ? "ok" : "error",
      message: result.message,
      detail: result.detail,
    });
    setBusy(false);
  };

  if (settings.persona !== "sales") return null;

  const isBar = variant === "bar";

  return (
    <div
      className={
        isBar
          ? "flex flex-wrap items-center gap-2 border-b border-line bg-surface-2/60 px-3 py-2"
          : "rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4 md:p-5"
      }
      data-testid="outreach-dispatch-panel"
    >
      {!isBar && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-body-sm font-semibold text-text">Outreach dispatch</h3>
            <p className="mt-1 text-mini text-text-2">
              Research &amp; draft — you send. Export leads, copy pack, or push to your webhook
              (Lemlist / Instantly / generic).
            </p>
          </div>
          <Badge tone="neutral">{leads.length} leads · {pack.messages.length} drafts</Badge>
        </div>
      )}

      {isBar && (
        <span className="text-mini text-text-2">Research &amp; draft — you send</span>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Download size={13} />}
          disabled={leads.length === 0}
          onClick={exportCsv}
        >
          Export leads CSV
        </Button>
        <Button variant="secondary" size="sm" iconLeft={<Copy size={13} />} onClick={() => void copyPack()}>
          Copy outreach pack
        </Button>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Save size={13} />}
          disabled={!projectRoot || busy}
          onClick={() => void savePackToRepo()}
        >
          Save pack to repo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Mail size={13} />}
          disabled={pack.messages.length === 0 && emailAssets.length === 0}
          onClick={openMailto}
        >
          Open in mail client
        </Button>
        <Button
          variant={isBar ? "ghost" : "primary"}
          size="sm"
          iconLeft={<Send size={13} />}
          disabled={!webhookUrl || busy || (leads.length === 0 && pack.messages.length === 0)}
          onClick={() => setConfirmOpen(true)}
        >
          Send to webhook
        </Button>
        {!webhookUrl && !isBar && (
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Settings size={13} />}
            onClick={() => {
              navigate("settings");
              toggleSettings(true);
            }}
          >
            Configure webhook
          </Button>
        )}
      </div>

      {!isBar && leads.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-line">
          <table className="w-full border-collapse text-left text-mini">
            <thead>
              <tr className="bg-surface text-[10px] uppercase tracking-wider text-text-3">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Why now</th>
                <th className="px-3 py-2 font-medium">Draft</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 10).map((l, i) => (
                <tr key={`${l.name}-${i}`} className="border-t border-line">
                  <td className="px-3 py-2 font-medium text-text">{l.name}</td>
                  <td className="px-3 py-2 text-text-2">{l.company || "—"}</td>
                  <td className="hidden max-w-[200px] truncate px-3 py-2 text-text-2 md:table-cell">
                    {l.why_now || l.fit_evidence.slice(0, 80) || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={l.draft_status === "draft_ready" ? "ok" : "neutral"}>
                      {l.draft_status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length > 10 && (
            <p className="border-t border-line px-3 py-2 text-micro text-text-3">
              +{leads.length - 10} more leads in CSV export
            </p>
          )}
        </div>
      )}

      {feedback && (
        <p
          className={`${isBar ? "w-full" : "mt-3"} text-mini ${
            feedback.tone === "ok"
              ? "text-ok"
              : feedback.tone === "warn"
                ? "text-warn"
                : "text-danger"
          }`}
        >
          {feedback.message}
          {feedback.detail && (
            <span className="mt-0.5 block text-micro text-text-3">{feedback.detail}</span>
          )}
        </p>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          data-testid="outreach-dispatch-confirm"
        >
          <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-warn/15 text-warn">
                <AlertTriangle size={18} />
              </span>
              <div>
                <h2 className="text-body-sm font-semibold text-text">Send to webhook?</h2>
                <p className="mt-2 text-mini text-text-2">
                  Push {leads.length} leads and {pack.messages.length} message drafts to your{" "}
                  <strong>{webhookProvider}</strong> endpoint. Marketing IDE never sends email for you
                  — review and launch from your outreach tool.
                </p>
                <p className="mt-2 truncate font-mono text-micro text-text-3">{webhookUrl}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                data-testid="outreach-dispatch-cancel"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={busy}
                data-testid="outreach-dispatch-confirm-send"
                onClick={() => void sendWebhook()}
              >
                Send pack
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Build dispatch body for store / API (testable). */
export function buildOutreachDispatchBody(
  pack: ReturnType<typeof buildOutreachPack>,
  webhookUrl: string,
  provider: string,
): Record<string, unknown> {
  return {
    ...packToWebhookPayload(pack, provider),
    webhook_url: webhookUrl,
  };
}
