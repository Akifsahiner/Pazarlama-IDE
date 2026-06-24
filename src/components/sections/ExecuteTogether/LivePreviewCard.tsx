import { Globe, Monitor } from "lucide-react";
import { sections } from "@/lib/tokens";

export function LivePreviewCard() {
  const { preview } = sections.execute;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 self-start rounded-full bg-[var(--accent-blue-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-blue)] ring-1 ring-[var(--accent-blue-border)]">
        <Monitor className="size-3" />
        {preview.badge}
      </div>

      <div className="overflow-hidden rounded-xl border border-black/6 bg-white">
        <div className="flex items-center gap-2 border-b border-black/6 bg-[var(--canvas)] px-3 py-2">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-[10px] text-ink-muted">
            <Globe className="size-2.5" />
            {preview.url}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3 px-5 py-7 text-center">
          <span className="tonal-badge tonal-badge-orange text-[10px]">For recruiters</span>
          <p className="font-serif text-xl leading-tight font-medium text-[#1A202C]">
            Turn every interview into structured hiring evidence.
          </p>
          <span className="rounded-lg bg-[var(--accent-blue-border)] px-4 py-2 text-xs font-medium text-white">
            Start free
          </span>
          <div className="mt-1 flex gap-1.5">
            <span className="h-1.5 w-12 rounded-full bg-black/6" />
            <span className="h-1.5 w-8 rounded-full bg-black/6" />
            <span className="h-1.5 w-10 rounded-full bg-black/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
