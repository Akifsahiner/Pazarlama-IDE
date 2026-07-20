import { Globe, Monitor } from "lucide-react";
import { sections } from "@/lib/tokens";

export function LivePreviewCard() {
  const { preview } = sections.execute;

  return (
    <div className="flex flex-col gap-3">
      <div className="tonal-badge self-start text-[11px]">
        <Monitor className="size-3" />
        {preview.badge}
      </div>

      <div className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.78)] bg-[rgba(255,252,245,0.72)] backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-[rgba(200,170,130,0.18)] bg-[rgba(255,252,245,0.55)] px-3 py-2">
          <span className="size-2.5 rounded-full bg-ink-3/40" />
          <span className="size-2.5 rounded-full bg-ink-3/40" />
          <span className="size-2.5 rounded-full bg-ink-3/40" />
          <span className="ml-2 flex items-center gap-1.5 rounded-md bg-surface px-2 py-0.5 text-[10px] text-ink-3">
            <Globe className="size-2.5" />
            {preview.url}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3 px-5 py-7 text-center">
          <span className="tonal-badge text-[10px]">For recruiters</span>
          <p className="font-serif text-xl leading-tight font-medium text-ink">
            Turn every interview into structured hiring evidence.
          </p>
          <span className="canvas-cta-pill">Start free</span>
          <div className="mt-1 flex gap-1.5">
            <span className="h-1.5 w-12 rounded-full bg-line" />
            <span className="h-1.5 w-8 rounded-full bg-line" />
            <span className="h-1.5 w-10 rounded-full bg-line" />
          </div>
        </div>
      </div>
    </div>
  );
}
