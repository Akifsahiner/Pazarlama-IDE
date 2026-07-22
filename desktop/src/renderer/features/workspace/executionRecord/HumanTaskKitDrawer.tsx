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
import { computeHookKillSuggestion } from "@shared/cmoDistributionOperator";
import { resolveQueuedHint } from "@shared/morningBrief";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { useApp } from "@renderer/state/store";

const INFLUENCER_STAGES = ["research", "pitched", "replied"] as const;

export function HumanTaskKitDrawer() {
  const ref = useApp((s) => s.pendingHumanTaskKitRef);
  const dismiss = useApp((s) => s.dismissHumanTaskKitDrawer);
  const markPosted = useApp((s) => s.markHumanTaskPosted);
  const logMetrics = useApp((s) => s.logHumanTaskMetrics);
  const completeKit = useApp((s) => s.completeHumanTaskKit);
  const exportOutreachCsv = useApp((s) => s.exportOutreachCsvFromKit);
  const openHumanTaskKitDrawer = useApp((s) => s.openHumanTaskKitDrawer);
  const openInfluencerDealModal = useApp((s) => s.openInfluencerDealModal);
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const distributionOperator = useApp(
    (s) => s.distributionOperator ?? s.marketingProfile?.distribution_operator,
  );
  const laneBWorkspace = useApp((s) => s.laneBWorkspace ?? s.marketingProfile?.lane_b_workspace);
  const drafts = useApp((s) => s.humanProofDrafts ?? {});

  const [postedUrl, setPostedUrl] = useState("");
  const [kpiValue, setKpiValue] = useState("");
  const [retentionPct, setRetentionPct] = useState("");
  const [views24h, setViews24h] = useState("");
  const [note, setNote] = useState("");
  const [replyInterest, setReplyInterest] = useState<"cold" | "warm" | "hot" | "">("");
  const [measureDeferred, setMeasureDeferred] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const morningQueuedHint = opsCadence ? resolveQueuedHint(opsCadence)?.message : undefined;

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

  const liveKill = useMemo(() => {
    if (!distributionOperator || asset?.kind !== "distribution_slot") return undefined;
    const slot = distributionOperator.slots.find((s) => s.id === ref?.item_id);
    return computeHookKillSuggestion(distributionOperator, slot?.hook_id);
  }, [distributionOperator, asset?.kind, ref?.item_id]);

  const killBanner = liveKill ?? asset?.kill_suggestion;
  const queuedHint = morningQueuedHint;
  const proofBlocked = Boolean(queuedHint);

  if (!ref || !asset) return null;

  const isDistribution = asset.kind === "distribution_slot";
  const isRunbook = asset.kind === "launch_runbook";
  const isInfluencer = asset.influencer_stage != null;
  const isOutbound = asset.kind === "outreach_pack" && (asset.outreach_targets?.length ?? 0) > 0;

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
    if (proofBlocked) return;
    const lint = lintHumanPostedProof({ url: postedUrl || draft?.posted_url, note });
    if (lint.length > 0) {
      setError(lint[0]!.detail);
      return;
    }
    const valid = validatePostedUrl(postedUrl || draft?.posted_url);
    if (!valid.ok) {
      setError(valid.error ?? "Invalid URL");
      return;
    }
    const err = markPosted(ref, (postedUrl || draft?.posted_url || "").trim(), note.trim() || undefined);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
  };

  const handleLogMetrics = () => {
    if (proofBlocked) return;
    if (!canAdvanceToMetrics(draft)) {
      setError("Mark posted with URL first.");
      return;
    }
    const num = kpiValue.trim() ? Number(kpiValue) : undefined;
    const retention = retentionPct.trim() ? Number(retentionPct) : undefined;
    const views = views24h.trim() ? Number(views24h) : undefined;
    logMetrics(ref, {
      kpi_value: Number.isFinite(num) ? num : undefined,
      retention_3s_pct: Number.isFinite(retention) ? retention : undefined,
      views_24h: Number.isFinite(views) ? views : undefined,
      reply_interest: replyInterest || undefined,
      reply_received: isInfluencer && asset.influencer_stage === "pitched" ? true : undefined,
      measure_deferred: measureDeferred,
      note: note.trim() || undefined,
    });
    setError(null);
  };

  const handleComplete = () => {
    if (proofBlocked) return;
    const err = completeKit(ref);
    if (err) {
      setError(err);
      return;
    }
    setPostedUrl("");
    setKpiValue("");
    setRetentionPct("");
    setViews24h("");
    setNote("");
    setReplyInterest("");
    setMeasureDeferred(false);
    setError(null);
    dismiss();
  };

  const handleRunbookStep = (itemId: string) => {
    const stepTask = opsCadence?.tasks.find((t) => t.human_execution_ref?.item_id === itemId);
    if (stepTask?.human_execution_ref) {
      openHumanTaskKitDrawer(stepTask.human_execution_ref);
    } else if (laneBWorkspace) {
      openHumanTaskKitDrawer({
        ...ref,
        item_id: itemId,
        label: laneBWorkspace.items.find((i) => i.id === itemId)?.title,
      });
    }
  };

  const urlLabel =
    isInfluencer && asset.influencer_stage === "pitched" ? "Thread URL" : "Post URL";

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
          {queuedHint && (
            <p className="mt-1 text-mini text-warn" data-testid="human-kit-queued-hint">
              {queuedHint}
            </p>
          )}
        </div>
        <button type="button" className="text-text-3 hover:text-text" onClick={dismiss} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {killBanner && (
        <div
          className="mx-4 mt-3 rounded-[var(--radius-md)] border border-warn/40 bg-warn/8 px-3 py-2 text-mini text-warn"
          data-testid="human-kit-kill-banner"
        >
          <span className="font-semibold">{killBanner.headline}</span>
          <p className="mt-0.5 text-text-2">{killBanner.detail}</p>
        </div>
      )}

      {isInfluencer && (
        <div className="flex gap-1 border-b border-line/60 px-4 py-2" data-testid="human-kit-influencer-rail">
          {INFLUENCER_STAGES.map((stage) => (
            <Badge
              key={stage}
              tone={asset.influencer_stage === stage ? "accent" : "neutral"}
            >
              {stage}
            </Badge>
          ))}
        </div>
      )}

      {isRunbook && asset.runbook_steps && asset.runbook_steps.length > 0 && (
        <div
          className="flex gap-1 overflow-x-auto border-b border-line/60 px-4 py-2"
          data-testid="human-kit-runbook-rail"
        >
          {asset.runbook_steps.map((s) => (
            <button
              key={s.item_id}
              type="button"
              className={`shrink-0 rounded-[var(--radius-sm)] px-2 py-1 text-mini ${
                s.is_current || ref.item_id === s.item_id
                  ? "bg-accent/15 font-semibold text-accent"
                  : "text-text-3 hover:text-text"
              }`}
              onClick={() => handleRunbookStep(s.item_id)}
            >
              {s.offset}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-mini font-semibold uppercase tracking-wide text-text-3">
            {isOutbound ? "Outreach copy" : "Script"}
          </span>
          <Button
            size="sm"
            variant="subtle"
            iconLeft={<Copy size={13} />}
            data-testid="human-kit-copy-all"
            onClick={() => void handleCopyAll()}
          >
            Copy all
          </Button>
        </div>

        {asset.copy_blocks.slice(0, isDistribution ? 2 : undefined).map((block) => (
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

        {isDistribution && (asset.hook_grid_rows?.length ?? 0) > 0 && (
          <div className="rounded-[var(--radius-md)] border border-line p-3" data-testid="human-kit-hook-grid">
            <div className="text-mini font-semibold uppercase tracking-wide text-text-3">
              Week 1 hook grid ({asset.hook_grid_count ?? asset.hook_grid_rows!.length} posts)
            </div>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {asset.hook_grid_rows!.map((row) => (
                <li key={row.slot_id} className="text-mini text-text-2">
                  <span className="font-medium text-text">{row.hook_label}</span>
                  {" · "}Day {row.day} · {row.platform}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isOutbound && asset.outreach_targets && asset.outreach_targets.length > 0 && (
          <div className="rounded-[var(--radius-md)] border border-line p-3" data-testid="human-kit-outreach-targets">
            <div className="text-mini font-semibold uppercase tracking-wide text-text-3">Next targets</div>
            <ul className="mt-2 space-y-1 text-body-sm text-text-2">
              {asset.outreach_targets.map((t, i) => (
                <li key={`${t.name}-${i}`}>
                  {t.name}
                  {t.handle ? ` (${t.handle})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

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
              {asset.success_criteria.utm && (
                <li className="font-mono text-mini">{asset.success_criteria.utm}</li>
              )}
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

        <div
          className={`border-t border-line pt-4 ${proofBlocked ? "pointer-events-none opacity-50" : ""}`}
          data-testid="human-kit-proof-stepper"
        >
          <div className="mb-3 flex gap-2">
            {(["draft", "posted", "metrics"] as const).map((s) => (
              <Badge key={s} tone={step === s ? "accent" : "neutral"}>
                {nextProofStepLabel(s === "draft" ? "draft" : s === "posted" ? "posted" : "metrics")}
              </Badge>
            ))}
          </div>

          {(step === "draft" || step === "posted") && (
            <div className="space-y-2">
              <label className="text-mini font-semibold text-text-3">{urlLabel}</label>
              <input
                type="url"
                value={postedUrl || draft?.posted_url || ""}
                onChange={(e) => setPostedUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body-sm"
                data-testid="human-kit-post-url"
                disabled={proofBlocked}
              />
              <Button
                size="sm"
                variant="primary"
                data-testid="human-kit-mark-posted"
                onClick={handleMarkPosted}
                disabled={proofBlocked}
              >
                Mark posted →
              </Button>
            </div>
          )}

          {(step === "posted" || step === "metrics") && canAdvanceToMetrics(draft) && (
            <div className="mt-3 space-y-2">
              {isDistribution && (
                <>
                  <label className="text-mini font-semibold text-text-3">3s retention %</label>
                  <input
                    type="number"
                    value={retentionPct || (draft?.retention_3s_pct != null ? String(draft.retention_3s_pct) : "")}
                    onChange={(e) => setRetentionPct(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body-sm"
                    data-testid="human-kit-retention"
                    disabled={proofBlocked}
                  />
                  <label className="text-mini font-semibold text-text-3">24h views</label>
                  <input
                    type="number"
                    value={views24h || (draft?.views_24h != null ? String(draft.views_24h) : "")}
                    onChange={(e) => setViews24h(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body-sm"
                    data-testid="human-kit-views"
                    disabled={proofBlocked}
                  />
                </>
              )}

              {isInfluencer && asset.influencer_stage === "pitched" && (
                <>
                  <label className="text-mini font-semibold text-text-3">Reply interest</label>
                  <select
                    value={replyInterest || draft?.reply_interest || ""}
                    onChange={(e) => setReplyInterest(e.target.value as "cold" | "warm" | "hot")}
                    className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body-sm"
                    data-testid="human-kit-reply-interest"
                    disabled={proofBlocked}
                  >
                    <option value="">Select…</option>
                    <option value="cold">Cold</option>
                    <option value="warm">Warm</option>
                    <option value="hot">Hot</option>
                  </select>
                </>
              )}

              {!isDistribution && (
                <>
                  <label className="text-mini font-semibold text-text-3">Metrics (optional)</label>
                  <input
                    type="number"
                    value={kpiValue}
                    onChange={(e) => setKpiValue(e.target.value)}
                    placeholder="Views, replies, signups…"
                    className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body-sm"
                    data-testid="human-kit-kpi"
                    disabled={proofBlocked}
                  />
                </>
              )}

              <label className="flex items-center gap-2 text-mini text-text-2">
                <input
                  type="checkbox"
                  checked={measureDeferred || draft?.measure_deferred === true}
                  onChange={(e) => setMeasureDeferred(e.target.checked)}
                  disabled={proofBlocked}
                  data-testid="human-kit-defer-measure"
                />
                Defer measurement to later this week
              </label>

              <Button
                size="sm"
                variant="secondary"
                data-testid="human-kit-log-metrics"
                onClick={handleLogMetrics}
                disabled={proofBlocked}
              >
                Log metrics →
              </Button>
            </div>
          )}

          {canAdvanceToMetrics(draft) && (
            <Button
              className="mt-3 w-full"
              size="sm"
              variant="primary"
              data-testid="human-kit-complete"
              onClick={handleComplete}
              disabled={proofBlocked}
            >
              Complete
            </Button>
          )}

          {isInfluencer && asset.influencer_stage === "replied" && (
            <Button
              className="mt-2 w-full"
              size="sm"
              variant="secondary"
              onClick={() => openInfluencerDealModal(ref.item_id)}
              disabled={proofBlocked}
            >
              Open deal terms →
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
