import { Radio } from "lucide-react";
import type { FrameHistoryEntry } from "@shared/types";

interface FilmstripProps {
  frames: FrameHistoryEntry[];
  selectedTs?: string;
  onSelect: (ts: string) => void;
  onLive: () => void;
}

/** Horizontal scrubber of recent frames; click to pin, "Live" returns to latest. */
export function Filmstrip({ frames, selectedTs, onSelect, onLive }: FilmstripProps) {
  if (frames.length === 0) return null;
  const selectedIndex = selectedTs ? frames.findIndex((f) => f.ts === selectedTs) : -1;

  return (
    <div className="flex items-center gap-2 border-t border-line bg-surface/60 px-2 py-1.5">
      <button
        onClick={onLive}
        className={`flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-[10.5px] ${
          selectedTs ? "text-text-3 hover:text-text" : "bg-accent-soft text-accent"
        }`}
      >
        <Radio size={11} /> Live
      </button>
      <span className="shrink-0 rounded-full border border-line bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-2">
        {selectedIndex >= 0 ? `Step ${selectedIndex + 1}/${frames.length}` : `${frames.length} frame${frames.length === 1 ? "" : "s"}`}
      </span>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
        {frames.map((f) => (
          <button
            key={f.ts}
            onClick={() => f.pngBase64 && onSelect(f.ts)}
            title={
              f.pngBase64
                ? f.action ?? f.url
                : "Frame trimmed to save memory — only recent frames keep pixels"
            }
            className={`h-10 w-16 shrink-0 overflow-hidden rounded-[4px] border ${
              selectedTs === f.ts ? "border-accent" : "border-line"
            } ${f.pngBase64 ? "" : "cursor-default"}`}
          >
            {f.pngBase64 ? (
              <img
                src={`data:image/png;base64,${f.pngBase64}`}
                alt=""
                className="h-full w-full bg-bg object-contain"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-elevated text-[8px] text-text-3">
                trimmed
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
