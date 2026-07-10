import { Loader2, Wrench } from "lucide-react";

/** Small inline status/tool chip rendered in the thread. */
export function EventChip({
  kind,
  label,
  spinning,
  onClick,
}: {
  kind: "status" | "tool" | "feed";
  label: string;
  spinning?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      {kind === "tool" ? (
        <Wrench size={11} className="text-text-3" />
      ) : kind === "feed" ? (
        <span className="text-[10px] font-semibold text-accent">Feed</span>
      ) : spinning ? (
        <Loader2 size={11} className="animate-spin text-accent" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-text-3" />
      )}
      <span className="min-w-0 break-words text-left">{label}</span>
    </>
  );

  const cls =
    "inline-flex max-w-full items-start gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-micro text-text-2";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} transition-colors hover:bg-elevated`}>
        {inner}
      </button>
    );
  }

  return <div className={cls}>{inner}</div>;
}
