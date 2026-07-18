import { CheckCircle2, Copy, Users } from "lucide-react";
import type { InfluencerOperatorWorkspace, PipelineStage } from "@shared/cmoInfluencerOperator";
import {
  countReplies,
  currentInfluencerDayIndex,
  getNextInfluencerTouch,
  pipelineStageCounts,
  pitchScaffoldForTouch,
  resolveWeeklyOutreachTarget,
} from "@shared/cmoInfluencerOperator";
import { influencerOutreachToCsv, outreachExportFilename } from "@shared/cmoOutreachExport";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { Card } from "@renderer/components/ui/Card";
import { GrowthMessageChip } from "./GrowthMessageChip";

export interface InfluencerOperatorPanelProps {
  operator: InfluencerOperatorWorkspace;
  compact?: boolean;
}

function nextStageForTouch(stage: PipelineStage): PipelineStage | null {
  if (stage === "research") return "pitched";
  if (stage === "pitched") return "replied";
  if (stage === "replied") return "brief_sent";
  if (stage === "live") return "reporting";
  return null;
}

export function InfluencerOperatorPanel({ operator, compact }: InfluencerOperatorPanelProps) {
  const openProof = useApp((s) => s.openInfluencerProofModal);
  const openDeal = useApp((s) => s.openInfluencerDealModal);
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const project = useApp((s) => s.project);
  const growthMemory = useApp((s) => s.growthMemory ?? s.marketingProfile?.growth_memory);
  const day = currentInfluencerDayIndex(operator);
  const volume = resolveWeeklyOutreachTarget(operator, day);
  const replies = countReplies(operator);
  const next = getNextInfluencerTouch(operator);
  const stages = pipelineStageCounts(operator);

  const exportCsv = () => {
    const csv = influencerOutreachToCsv(operator);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outreachExportFilename(project?.name ?? "project", operator.week_index);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card data-testid="influencer-operator-panel" className={compact ? "p-3" : "p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-accent" />
            <h3 className="text-body-sm font-semibold text-text">Influencer Operator</h3>
            <Badge tone="accent">Micro-influencer DM</Badge>
          </div>
          <p className="mt-1 text-mini text-text-2">
            Today: {volume.done}/{volume.max} DMs · {replies} replies
          </p>
          <p className="mt-0.5 text-[10px] text-text-3">
            Lane B synced from operator — pipeline + deal proof here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
          {next && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (next.pipeline_stage === "replied") openDeal(next.id);
                else openProof(next.id);
              }}
            >
              {next.pipeline_stage === "research" ? "Send DM" : "Log proof"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-mini text-text-2">
        {operator.pitches.map((p) => {
          const memory = growthMemory?.messages.find(
            (message) =>
              message.kind === "pitch" &&
              message.source_ref === p.id &&
              message.cycle_index === growthMemory.last_harvest_cycle_index,
          );
          return (
            <span key={p.id} className="flex items-center gap-1">
              <span className="rounded-[var(--radius-sm)] bg-surface-2 px-2 py-0.5">
                {p.label}: {p.template_id.replace(/_/g, " ")}
              </span>
              {memory && <GrowthMessageChip message={memory} />}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-mini">
        <Badge tone="neutral">Research {stages.research}</Badge>
        <Badge tone="neutral">Pitched {stages.pitched}</Badge>
        <Badge tone="neutral">Replied {stages.replied}</Badge>
        <Badge tone="neutral">Deal {stages.deal}</Badge>
        <Badge tone="neutral">Live {stages.live}</Badge>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-mini">
          <thead>
            <tr className="border-b border-line text-text-3">
              <th className="py-1 pr-2">Handle</th>
              <th className="px-1 py-1">Platform</th>
              <th className="px-1 py-1">Fit</th>
              <th className="px-1 py-1">Pitch</th>
              <th className="px-1 py-1">Stage</th>
              <th className="px-1 py-1">UTM</th>
              <th className="px-1 py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {operator.touches.slice(0, compact ? 8 : 15).map((touch) => {
              const pitch = operator.pitches.find((p) => p.id === touch.pitch_id);
              const scaffold = pitchScaffoldForTouch(operator, touch);
              return (
                <tr key={touch.id} className="border-b border-line/40">
                  <td className="py-1.5 pr-2 text-text">{touch.target_handle || touch.target_name}</td>
                  <td className="px-1 py-1.5 text-text-2">{touch.platform}</td>
                  <td className="px-1 py-1.5 text-text-2">{touch.icp_fit ?? "—"}</td>
                  <td className="px-1 py-1.5 text-text-2">{pitch?.label ?? touch.pitch_id}</td>
                  <td className="px-1 py-1.5 text-text-2">{touch.pipeline_stage}</td>
                  <td className="px-1 py-1.5 text-text-3">{touch.deal?.utm_campaign ?? "—"}</td>
                  <td className="px-1 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {touch.pipeline_stage !== "skipped" && nextStageForTouch(touch.pipeline_stage) && (
                        <button
                          type="button"
                          className="text-accent hover:underline"
                          onClick={() => {
                            if (touch.pipeline_stage === "replied") openDeal(touch.id);
                            else openProof(touch.id);
                          }}
                        >
                          {touch.pipeline_stage === "research" ? "DM" : "Proof"}
                        </button>
                      )}
                      {(touch.pipeline_stage === "reporting" ||
                        touch.pipeline_stage === "live" ||
                        touch.proof?.reply_received) && (
                        <CheckCircle2 size={14} className="text-ok" />
                      )}
                      <button
                        type="button"
                        className="text-text-3 hover:text-text"
                        title="Copy pitch scaffold"
                        onClick={() => void navigator.clipboard.writeText(scaffold)}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {operator.verdict && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-line/60 bg-surface-2/50 p-3">
          <p className="text-body-sm font-medium text-text">{operator.verdict.headline}</p>
          <p className="mt-1 text-mini text-text-2">{operator.verdict.rationale[0]}</p>
          {(operator.verdict.kind === "double_down" || operator.verdict.kind === "scale") && (
            <Button
              variant="subtle"
              size="sm"
              className="mt-2"
              onClick={() => startNextCmoCycle({ mode: "double_down" })}
            >
              Double down next week
            </Button>
          )}
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-mini text-text-3">Pitch scaffolds</summary>
        <ul className="mt-2 space-y-2">
          {operator.pitches.map((p) => (
            <li key={p.id} className="text-mini text-text-2">
              <span className="font-medium text-text">{p.label}:</span> {p.script_scaffold}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
