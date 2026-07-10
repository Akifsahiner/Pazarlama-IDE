import { Plug, Sparkles } from "lucide-react";
import type { RuntimeCapability } from "@shared/runtimeCapability";
import { Button } from "@renderer/components/ui/Button";

const COPY: Record<
  "chat" | "plan" | "run" | "browser",
  { title: string; body: string; primary: string }
> = {
  chat: {
    title: "Connect to chat with the agent",
    body: "Your project scan is ready. Sign in to ask questions and get marketing guidance.",
    primary: "Connect",
  },
  plan: {
    title: "Connect to generate your launch plan",
    body: "Preview the outline from your scan, or connect to generate a personalized plan with AI.",
    primary: "Connect",
  },
  run: {
    title: "Connect to run the agent",
    body: "Agent runs need an active connection to execute tasks in your project.",
    primary: "Connect",
  },
  browser: {
    title: "Connect for browser tasks",
    body: "Web research runs through the connected backend sandbox.",
    primary: "Connect",
  },
};

export function ConnectGate({
  feature,
  capability,
  onConnect,
  compact,
}: {
  feature: keyof typeof COPY;
  capability: RuntimeCapability;
  onConnect: () => void;
  compact?: boolean;
}) {
  if (capability === "connected") return null;

  const copy = COPY[feature];
  const isDegraded = capability === "degraded";

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
            {isDegraded
              ? "The backend is reachable but AI isn't configured yet. Check connection settings or try again."
              : copy.body}
          </p>
          <div className="mt-2">
            <Button size="sm" variant="primary" onClick={onConnect}>
              {copy.primary}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
