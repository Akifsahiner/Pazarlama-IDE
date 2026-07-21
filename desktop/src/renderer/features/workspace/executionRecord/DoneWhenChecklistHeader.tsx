import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type { DoneWhenChecklistItem } from "@shared/doneWhenChecklist";
import { countIncompleteRequiredItems } from "@shared/doneWhenChecklist";

function StatusIcon({ status }: { status: DoneWhenChecklistItem["status"] }) {
  if (status === "done") return <CheckCircle2 size={14} className="text-ok" />;
  if (status === "failed") return <XCircle size={14} className="text-warn" />;
  if (status === "skipped") return <Circle size={14} className="text-text-3" />;
  return <Circle size={14} className="text-text-3" />;
}

export function DoneWhenChecklistHeader({
  doneWhen,
  items,
}: {
  doneWhen?: string;
  items: DoneWhenChecklistItem[];
}) {
  const remaining = countIncompleteRequiredItems(items);

  return (
    <div
      className={`border-b px-4 py-3 ${
        remaining > 0 ? "border-warn/30 bg-warn/5" : "border-line/60 bg-surface-2/40"
      }`}
      data-testid="done-when-checklist"
    >
      {doneWhen && (
        <p className="text-mini text-text-2">
          <span className="font-semibold uppercase tracking-wide text-text-3">Done when · </span>
          {doneWhen}
        </p>
      )}
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-mini text-text-2">
            <StatusIcon status={item.status} />
            <span className={item.status === "done" ? "text-text" : undefined}>{item.label}</span>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <p className="mt-2 text-[10px] font-medium text-warn">
          {remaining} required criteria remaining
        </p>
      )}
    </div>
  );
}
