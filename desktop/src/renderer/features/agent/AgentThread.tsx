import { History, PanelRightClose, Sparkles } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { IconButton } from "@renderer/components/ui/IconButton";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { ShipRecoveryCard } from "./ShipRecoveryCard";
import { ShipWinCard } from "@renderer/features/workspace/ShipWinCard";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";

export function AgentThread() {
  const toggleFocusMode = useApp((s) => s.toggleFocusMode);
  const toggleHistory = useApp((s) => s.toggleHistory);
  const historyOpen = useApp((s) => s.historyOpen);
  const shipRecovery = useApp((s) => s.shipRecovery);
  const firstShipLedger = useApp((s) => s.firstShipLedger);
  const openStrategicIntake = useApp((s) => s.openStrategicIntake);
  const channelThesis = useApp((s) => s.channelThesis);
  const marketingProfile = useApp((s) => s.marketingProfile);

  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-label font-medium text-text">
            <Sparkles size={14} className="text-accent" />
            Komut
          </div>
          <div className="flex items-center gap-0.5">
            <IconButton
              label="Session history (Ctrl+H)"
              size="sm"
              active={historyOpen}
              onClick={() => toggleHistory()}
            >
              <History size={14} />
            </IconButton>
            <IconButton
              label="Focus mode — hide this panel"
              size="sm"
              onClick={() => toggleFocusMode(true)}
            >
              <PanelRightClose size={14} />
            </IconButton>
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-micro leading-relaxed text-text-3">
          Komut ver — sonuçlar soldaki Record ve çalışma alanında görünür.
        </p>
      </div>
      {shipRecovery && (
        <div className="border-b border-line px-3 py-2">
          <ShipRecoveryCard recovery={shipRecovery} />
        </div>
      )}
      {firstShipLedger && (
        <div className="border-b border-line px-3 py-2">
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
