import { Plug, Sparkles } from "lucide-react";
import type { RuntimeCapability } from "@shared/runtimeCapability";
import type { CapabilityMatrix, CapId } from "@shared/capability";
import { fixLabel } from "@shared/capability";
import { Button } from "@renderer/components/ui/Button";

const FEATURE_CAPS: Record<"chat" | "plan" | "run" | "browser", CapId[]> = {
  chat: ["backend", "auth", "anthropic"],
  plan: ["backend", "auth", "anthropic"],
  run: ["backend", "auth", "anthropic", "local_agent"],
  browser: ["backend", "auth", "anthropic", "computer_use"],
};

const COPY: Record<
  "chat" | "plan" | "run" | "browser",
  { title: string; body: string }
> = {
  chat: {
    title: "Sign in to chat with the agent",
    body: "Your project scan is ready. Enable AI to ask questions and get marketing guidance.",
  },
  plan: {
    title: "Enable AI to generate your launch plan",
    body: "Preview the outline from your scan, or enable AI for a personalized plan.",
  },
  run: {
    title: "Enable AI to run the agent",
    body: "Agent runs need a ready AI connection to execute tasks in your project.",
  },
  browser: {
    title: "Enable AI for live browser tasks",
    body: "Web research runs through the Computer Use sandbox when AI is ready.",
  },
};

export function ConnectGate({
  feature,
  capability,
  matrix,
  onConnect,
  compact,
}: {
  feature: keyof typeof COPY;
  capability: RuntimeCapability;
  matrix?: CapabilityMatrix;
  onConnect: () => void;
  compact?: boolean;
}) {
  if (capability === "connected") return null;

  const copy = COPY[feature];
  const isDegraded = capability === "degraded";
  const need = FEATURE_CAPS[feature];
  const label = matrix
    ? fixLabel(matrix, need)
    : isDegraded
      ? "Open connection settings"
      : "Retry connection";
  const reason = matrix
    ? need.map((id) => matrix.caps[id]).find((c) => c.state !== "ready")?.reason
    : undefined;

  return (
    <div
      className={`rounded-[var(--radius-md)] border border-line bg-surface-2/80 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
          {isDegraded ? <Sparkles size={16} /> : <Plug size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`font-medium text-text ${compact ? "text-body-sm" : "text-body"}`}>
            {isDegraded ? "AI service isn't ready yet" : copy.title}
          </div>
          <p className="mt-0.5 text-body-sm text-text-2">
            {reason ??
              (isDegraded
                ? "The backend is reachable but AI isn't configured yet. Check connection settings or try again."
                : copy.body)}
          </p>
          <div className="mt-2">
            <Button size="sm" variant="primary" onClick={onConnect}>
              {label}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
