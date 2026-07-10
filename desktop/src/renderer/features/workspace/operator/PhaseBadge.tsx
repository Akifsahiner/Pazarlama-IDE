import { Brain, Hand, Loader2, MousePointerClick, ShieldQuestion } from "lucide-react";
import type { OperatorPhase } from "@shared/types";

const PHASE: Record<OperatorPhase, { label: string; icon: typeof Brain; tone: string }> = {
  thinking: { label: "Thinking", icon: Brain, tone: "text-text-2" },
  acting: { label: "Acting", icon: MousePointerClick, tone: "text-accent" },
  waiting_approval: { label: "Waiting for you", icon: ShieldQuestion, tone: "text-warn" },
  verifying: { label: "Verifying", icon: Loader2, tone: "text-text-2" },
};

export function PhaseBadge({ phase, paused }: { phase?: OperatorPhase; paused?: boolean }) {
  if (paused) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 text-micro text-warn">
        <Hand size={12} /> You have control
      </span>
    );
  }
  if (!phase) return null;
  const p = PHASE[phase];
  const Icon = p.icon;
  return (
    <span className={`flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-micro ${p.tone}`}>
      <Icon size={12} className={phase === "thinking" || phase === "verifying" ? "animate-pulse" : ""} />
      {p.label}
    </span>
  );
}
