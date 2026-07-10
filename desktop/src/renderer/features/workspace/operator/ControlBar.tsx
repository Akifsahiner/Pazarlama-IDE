import { Hand, Pause, Play, Square } from "lucide-react";
import { Switch } from "@renderer/components/ui/Switch";

interface ControlBarProps {
  running: boolean;
  paused: boolean;
  autoApprove: boolean;
  onPause: () => void;
  onResume: () => void;
  onTakeOver: () => void;
  onStop: () => void;
  onSetAuto: (value: boolean) => void;
}

/**
 * Operator controls. The safe-actions toggle stays available while idle (it
 * applies to the next task); run controls appear only during a session.
 */
export function ControlBar({
  running,
  paused,
  autoApprove,
  onPause,
  onResume,
  onTakeOver,
  onStop,
  onSetAuto,
}: ControlBarProps) {
  const btn =
    "flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-2.5 py-1 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text";
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line bg-surface/70 px-3 py-1.5">
      <label className="flex items-center gap-2 text-micro text-text-2">
        <Switch checked={autoApprove} onChange={onSetAuto} label="Auto-approve safe actions" />
        Safe actions: {autoApprove ? "Auto" : "Ask"}
      </label>

      {running && (
        <div className="flex items-center gap-2">
          {paused ? (
            <button onClick={onResume} className={btn}>
              <Play size={12} /> Resume
            </button>
          ) : (
            <button onClick={onPause} className={btn}>
              <Pause size={12} /> Pause
            </button>
          )}
          {/* Honest label: this pauses and hands you the steering input — it is
              not raw input forwarding (that is a future capability). */}
          <button onClick={onTakeOver} className={btn} title="Pause the agent and give it new instructions">
            <Hand size={12} /> Pause &amp; steer
          </button>
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-danger-border bg-danger-soft px-2.5 py-1 text-micro text-danger"
          >
            <Square size={11} fill="currentColor" /> Stop
          </button>
        </div>
      )}
    </div>
  );
}
