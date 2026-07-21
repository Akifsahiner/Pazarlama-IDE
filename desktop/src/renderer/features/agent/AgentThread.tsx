import {
  ChevronDown,
  History,
  Maximize2,
  PanelRightClose,
  Sparkles,
} from "lucide-react";
import { useApp } from "@renderer/state/store";
import { IconButton } from "@renderer/components/ui/IconButton";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { ShipRecoveryCard } from "./ShipRecoveryCard";
import { ShipWinCard } from "@renderer/features/workspace/ShipWinCard";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";

export type AgentThreadLayout = "sidebar" | "bottom";

export interface AgentThreadProps {
  layout?: AgentThreadLayout;
  onCollapse?: () => void;
  onFocusArtifact?: () => void;
}

export function AgentThread({
  layout = "sidebar",
  onCollapse,
  onFocusArtifact,
}: AgentThreadProps = {}) {
  const toggleFocusMode = useApp((s) => s.toggleFocusMode);
  const toggleHistory = useApp((s) => s.toggleHistory);
  const historyOpen = useApp((s) => s.historyOpen);
  const shipRecovery = useApp((s) => s.shipRecovery);
  const firstShipLedger = useApp((s) => s.firstShipLedger);
  const openStrategicIntake = useApp((s) => s.openStrategicIntake);
  const channelThesis = useApp((s) => s.channelThesis);
  const marketingProfile = useApp((s) => s.marketingProfile);

  const isBottom = layout === "bottom";
  const subtitle = isBottom
    ? "Komut ver — sonuçlar yukarıdaki Record ve çalışma alanında görünür."
    : "Komut ver — sonuçlar soldaki Record ve çalışma alanında görünür.";

  return (
    <aside
      className={`flex h-full w-full flex-col bg-surface ${
        isBottom ? "border-t border-line/80" : "border-l border-line"
      }`}
      data-testid="agent-thread"
      data-layout={layout}
    >
      <div className="shrink-0 border-b border-line/60 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-label font-medium text-text">
            <Sparkles size={14} className="shrink-0 text-accent" />
            <span>Komut</span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              label="Session history (Ctrl+H)"
              size="sm"
              active={historyOpen}
              onClick={() => toggleHistory()}
            >
              <History size={14} />
            </IconButton>
            {isBottom && onFocusArtifact && (
              <IconButton
                label="Çalışma alanına odaklan"
                size="sm"
                onClick={onFocusArtifact}
              >
                <Maximize2 size={14} />
              </IconButton>
            )}
            {isBottom && onCollapse ? (
              <IconButton label="Komutu küçült" size="sm" onClick={onCollapse}>
                <ChevronDown size={14} />
              </IconButton>
            ) : (
              <IconButton
                label="Focus mode — hide this panel"
                size="sm"
                onClick={() => toggleFocusMode(true)}
              >
                <PanelRightClose size={14} />
              </IconButton>
            )}
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-micro leading-relaxed text-text-3">{subtitle}</p>
      </div>
      {shipRecovery && (
        <div className="shrink-0 border-b border-line px-3 py-2">
          <ShipRecoveryCard recovery={shipRecovery} />
        </div>
      )}
      {firstShipLedger && (
        <div className="shrink-0 border-b border-line px-3 py-2">
          <ShipWinCard
            ledger={firstShipLedger}
            compact
            onContinueCmo={
              channelThesis && !isStrategicDecisionSealed(marketingProfile)
                ? openStrategicIntake
                : undefined
            }
          />
        </div>
      )}
      <MessageList />
      <Composer />
    </aside>
  );
}
