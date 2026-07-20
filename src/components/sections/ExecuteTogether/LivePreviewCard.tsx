import { Globe, Monitor } from "lucide-react";
import { sections } from "@/lib/tokens";

export function LivePreviewCard({ dark = false }: { dark?: boolean }) {
  const { preview } = sections.execute;

  if (dark) {
    return (
      <div className="flex flex-col gap-3">
        <div className="tonal-badge atelier-glass-capsule atelier-glass-capsule--dark self-start text-[11px]">
          <Monitor className="size-3" />
          {preview.badge}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1018]">
          <div className="flex items-center gap-2 border-b border-white/8 bg-[#10141c] px-3 py-2">
            <span className="size-2.5 rounded-full bg-red-400/60" />
            <span className="size-2.5 rounded-full bg-yellow-400/60" />
            <span className="size-2.5 rounded-full bg-green-400/60" />
            <span className="ml-2 flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/50">
              <Globe className="size-2.5" />
              {preview.url}
            </span>
          </div>

          <div className="flex flex-col items-center gap-3 px-5 py-7 text-center">
            <span className="atelier-glass-capsule atelier-glass-capsule--dark text-[10px]">For recruiters</span>
            <p className="font-serif text-xl leading-tight font-medium text-white/92">
              Turn every interview into structured hiring evidence.
            </p>
            <span className="shimmer-button shimmer-button--compact inline-flex rounded-lg px-4 py-2 text-xs font-medium text-white">
              Start free
            </span>
            <div className="mt-1 flex gap-1.5">
              <span className="h-1.5 w-12 rounded-full bg-white/15" />
              <span className="h-1.5 w-8 rounded-full bg-white/10" />
              <span className="h-1.5 w-10 rounded-full bg-white/12" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="tonal-badge self-start text-[11px]">
        <Monitor className="size-3" />
        {preview.badge}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
          <Globe className="size-2.5 text-ink-3" />
          <span className="text-[10px] text-ink-3">{preview.url}</span>
        </div>
        <div className="px-5 py-7 text-center">
          <span className="shimmer-button shimmer-button--compact inline-flex rounded-lg px-4 py-2 text-xs text-white">
            Start free
          </span>
        </div>
      </div>
    </div>
  );
}
