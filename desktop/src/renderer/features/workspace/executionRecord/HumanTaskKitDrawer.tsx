import { useMemo, useState } from "react";
import { Copy, ExternalLink, X } from "lucide-react";
import type { HumanExecutionAsset } from "@shared/humanExecutionAsset";
import { assetCopyAllText } from "@shared/buildHumanExecutionAsset";
import {
  canAdvanceToMetrics,
  nextProofStepLabel,
  resolveHumanProofStep,
  validatePostedUrl,
} from "@shared/humanProofProgress";
import { lintHumanPostedProof } from "@shared/humanExecutionContractLint";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { useApp } from "@renderer/state/store";

export function HumanTaskKitDrawer() {
  const ref = useApp((s) => s.pendingHumanTaskKitRef);
  const dismiss = useApp((s) => s.dismissHumanTaskKitDrawer);
  const markPosted = useApp((s) => s.markHumanTaskPosted);
  const logMetrics = useApp((s) => s.logHumanTaskMetrics);
  const completeKit = useApp((s) => s.completeHumanTaskKit);
  const exportOutreachCsv = useApp((s) => s.exportOutreachCsvFromKit);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const drafts = useApp((s) => s.humanProofDrafts ?? {});

  const [postedUrl, setPostedUrl] = useState("");
  const [kpiValue, setKpiValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const task = useMemo(() => {
    if (!ref || !opsCadence) return undefined;
    return opsCadence.tasks.find(
      (t) => t.human_execution_ref?.item_id === ref.item_id || t.id === ref.item_id,
    );
  }, [ref, opsCadence]);

  const asset: HumanExecutionAsset | undefined = task?.human_execution_asset;

  const draftKey = ref?.item_id ?? "";
  const draft = drafts[draftKey];
  const step = resolveHumanProofStep(draft, false);

  if (!ref || !asset) return null;

  const toggleCheck = (id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(assetCopyAllText(asset));
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleMarkPosted = () => {
    const lint = lintHumanPostedProof({ url: postedUrl, note });
    if (lint.length > 0) {
      setError(lint[0]!.detail);
      return;
    }
    const valid = validatePostedUrl(postedUrl);
    if (!valid.ok) {
      setError(valid.error ?? "Invalid URL");
      return;
    }
    const err = markPosted(ref, postedUrl.trim(), note.trim() || undefined);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
  };

  const handleLogMetrics = () => {
    if (!canAdvanceToMetrics(draft)) {
      setError("Mark posted with URL first.");
      return;
    }
    const num = kpiValue.trim() ? Number(kpiValue) : undefined;
    logMetrics(ref, { kpi_value: Number.isFinite(num) ? num : undefined, note: note.trim() });
    setError(null);
  };

  const handleComplete = () => {
    const err = completeKit(ref);
    if (err) {
      setError(err);
      return;
    }
    setPostedUrl("");
    setKpiValue("");
    setNote("");
    setError(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-y-0 right-0 z-[var(--z-modal)] flex w-full max-w-md flex-col border-l border-line bg-surface shadow-[var(--shadow-3)]"
      data-testid="human-task-kit-drawer"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-body-sm font-semibold text-text">{asset.title}</h2>
          <p className="mt-0.5 text-micro text-text-3">{task?.what}</p>
        </div>
        <button type="button" className="text-text-3 hover:text-text" onClick={dismiss} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {asset.kill_suggestion && (
        <div
          className="mx-4 mt-3 rounded-[var(--radius-md)] border border-warn/40 bg-warn/8 px-3 py-2 text-mini text-warn"
          data-testid="human-kit-kill-banner"
        >
          <span className="font-semibold">{asset.kill_suggestion.headline}</span>
          <p className="mt-0.5 text-text-2">{asset.kill_suggestion.detail}</p>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-mini font-semibold uppercase tracking-wide text-text-3">Script</span>
          <Button size="sm" variant="subtle" iconLeft={<Copy size={13} />} data-testid="human-kit-copy-all" onClick={() => void handleCopyAll()}>
            Copy all
          </Button>
        </div>

        {asset.copy_blocks.map((block) => (
          <div
            key={block.id}
            className="rounded-[var(--radius-md)] border border-line bg-surface-2/40 p-3"
            data-testid={`human-kit-copy-${block.id}`}
          >
            <div className="text-mini font-semibold text-text-3">{block.label}</div>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-body-sm leading-relaxed text-text">
              {block.body}
            </pre>
          </div>
        ))}

        {asset.success_criteria && (
          <div className="rounded-[var(--radius-md)] border border-line p-3">
            <div className="text-mini font-semibold uppercase tracking-wide text-text-3">Success criteria</div>
            <ul className="mt-2 space-y-1 text-body-sm text-text-2">
              {asset.success_criteria.retention_3s_target != null && (
                <li>3s retention target: ≥ {asset.success_criteria.retention_3s_target}%</li>
              )}
              {asset.success_criteria.views_24h_target != null && (
                <li>24h views target: {asset.success_criteria.views_24h_target}</li>
              )}
              {asset.success_criteria.utm && <li className="font-mono text-mini">{asset.success_criteria.utm}</li>}
            </ul>
          </div>
        )}

        <div>
          <div className="text-mini font-semibold uppercase tracking-wide text-text-3">Platform checklist</div>
          <ul className="mt-2 space-y-2">
            {asset.platform_checklist.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-2 text-body-sm text-text">
                  <input
                    type="checkbox"
                    checked={checklist[item.id] ?? item.checked ?? false}
                    onChange={() => toggleCheck(item.id)}
                    className="mt-0.5"
                  />
                  {item.label}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {asset.platform_deep_links?.map((link) => (
          <Button
            key={link.url}
            size="sm"
            variant="secondary"
            iconLeft={<ExternalLink size={13} />}
            onClick={() => void window.api.shell.openExternal(link.url)}
          >
            {link.label}
          </Button>
        ))}

        {asset.honesty_note && (
          <p className="rounded-[var(--radius-sm)] border border-line/60 bg-surface-2/30 px-3 py-2 text-mini text-text-2">
            {asset.honesty_note}
          </p>
        )}

        <div className="border-t border-line pt-4" data-testid="human-kit-proof-stepper">
          <div className="mb-3 flex gap-2">
            {(["draft", "posted", "metrics"] as const).map((s) => (
              <Badge key={s} tone={step === s || (s === "draft" && step === "draft") ? "accent" : "neutral"}>
                {nextProofStepLabel(s === "draft" ? "draft" : s === "posted" ? "posted" : "metrics")}
              </Badge>
            ))}
          </div>

          {(step === "draft" || step === "posted") && (
            <div className="space-y-2">
              <label className="text-mini font-semibold text-text-3">Post URL</label>
              <input
                type="url"
                value={postedUrl || draft?.posted_url || ""}
                onChange={(e) => setPostedUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body-sm"
                data-testid="human-kit-post-url"
              />
              <Button size="sm" variant="primary" data-testid="human-kit-mark-posted" onClick={handleMarkPosted}>
                Mark posted →
              </Button>
            </div>
          )}

          {(step === "posted" || step === "metrics") && canAdvanceToMetrics(draft) && (
            <div className="mt-3 space-y-2">
              <label className="text-mini font-semibold text-text-3">Metrics (optional)</label>
              <input
                type="number"
                value={kpiValue}
                onChange={(e) => setKpiValue(e.target.value)}
                placeholder="Views, replies, signups…"
                className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body-sm"
                data-testid="human-kit-kpi"
              />
              <Button size="sm" variant="secondary" data-testid="human-kit-log-metrics" onClick={handleLogMetrics}>
                Log metrics →
              </Button>
            </div>
          )}

          {canAdvanceToMetrics(draft) && (
            <Button className="mt-3 w-full" size="sm" variant="primary" data-testid="human-kit-complete" onClick={handleComplete}>
              Complete
            </Button>
          )}
        </div>

        {ref.export_kind === "outreach_csv" && (
          <Button size="sm" variant="secondary" onClick={() => exportOutreachCsv()}>
            Export outreach CSV
          </Button>
        )}

        {error && <p className="text-mini text-warn">{error}</p>}
      </div>
    </div>
  );
}
