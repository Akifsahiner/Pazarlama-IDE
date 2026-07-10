import { Globe, MessageSquare, Rocket, Sparkles, Wand2 } from "lucide-react";
import type { ResolvedConversationIntent } from "@shared/conversationIntent";
import { describeResolvedIntent } from "@shared/intentPreview";

const ICONS = {
  ask: MessageSquare,
  edit: Rocket,
  browse: Globe,
  plan: Wand2,
  apply: Sparkles,
} as const;

export function IntentPreviewChip({
  resolved,
  message,
}: {
  resolved: ResolvedConversationIntent;
  message: string;
}) {
  const copy = describeResolvedIntent(resolved, message);
  const Icon = ICONS[copy.icon];

  return (
    <div
      data-testid="intent-preview-chip"
      className="mb-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-accent/25 bg-accent-soft/20 px-3 py-2"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
        <Icon size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-mini font-medium text-text">{copy.chipLabel}</p>
        {copy.chipDetail && (
          <p className="mt-0.5 line-clamp-2 text-micro text-text-2">{copy.chipDetail}</p>
        )}
        {copy.needsConfirm && (
          <p className="mt-1 text-micro text-warn">Confirm after send — file edits require approval.</p>
        )}
      </div>
    </div>
  );
}
