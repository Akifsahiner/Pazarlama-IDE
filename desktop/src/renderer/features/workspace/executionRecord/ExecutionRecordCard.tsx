import { LayoutList, Play } from "lucide-react";
import type { ExecutionRecordView } from "@shared/executionRecord";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { ExecutionRecordField } from "./ExecutionRecordField";
import { ExecutionRecordLifecycleRail } from "./ExecutionRecordLifecycleRail";
import { useCommandSurfaceDispatch } from "./useCommandSurfaceDispatch";
import { CommandSurfaceGovernanceBanner } from "../CommandSurfaceGovernanceBanner";
import { useApp } from "@renderer/state/store";

export function ExecutionRecordCard({ record }: { record: ExecutionRecordView }) {
  const dispatch = useCommandSurfaceDispatch();
  const toggleWarRoomExpanded = useApp((s) => s.toggleWarRoomExpanded);
  const warRoomExpanded = useApp((s) => s.warRoomExpanded);
  const primary = record.next.action.kind !== "none" ? record.next.action : null;

  return (
    <section
      className="mx-auto w-full max-w-3xl rounded-[var(--radius-xl)] border border-accent/25 bg-elevated/90 p-5 shadow-[var(--shadow-2)] backdrop-blur-sm md:p-6"
      data-testid="execution-record-card"
      aria-label="Execution Record"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            Execution Record
          </div>
          <ExecutionRecordLifecycleRail lifecycle={record.lifecycle} />
        </div>
        {record.growthStatePlaceholder && (
          <span title={record.growthStatePlaceholder}>
            <Badge tone="neutral" className="max-w-[200px] truncate">
              {record.growthStatePlaceholder.slice(0, 40)}
            </Badge>
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ExecutionRecordField label="Amaç" value={record.goal} emphasis />
        <ExecutionRecordField label="Deney" value={record.experiment} />
        <ExecutionRecordField
          label="Durum"
          value={record.lifecycleLabel}
          emphasis
        />
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
            Yapılan
          </div>
          {record.done.length === 0 ? (
            <p className="mt-1 text-body-sm text-text-3">Henüz kayıt yok</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {record.done.map((item) => (
                <li key={item.id} className="text-body-sm text-text-2">
                  <span className="font-medium text-text">{item.label}</span>
                  {item.detail && (
                    <span className="mt-0.5 block truncate text-mini text-text-3" title={item.detail}>
                      {item.detail}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="min-w-0 sm:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3">Sonuç</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {record.results.map((chip) => (
              <span
                key={chip.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-mini ${
                  chip.tone === "ok"
                    ? "border-ok/40 bg-ok/10 text-ok"
                    : chip.tone === "missing"
                      ? "border-line bg-surface-2 text-text-3"
                      : "border-line bg-surface-2 text-text-2"
                }`}
              >
                <span className="font-medium">{chip.label}</span>
                {chip.value && <span>{chip.value}</span>}
              </span>
            ))}
          </div>
        </div>
        {record.learned && (
          <div className="sm:col-span-2">
            <ExecutionRecordField label="Öğrenilen" value={record.learned} quote />
          </div>
        )}
        <div className="sm:col-span-2">
          <ExecutionRecordField
            label="Sonraki"
            value={record.next.label}
            emphasis
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-4">
        <Button variant="subtle" size="sm" onClick={() => toggleWarRoomExpanded()}>
          <LayoutList size={14} className="mr-1" />
          {warRoomExpanded ? "Backstage kapat" : "Backstage aç"}
        </Button>
        {primary && (
          <Button
            variant="primary"
            size="sm"
            data-testid={primary.testId}
            onClick={() => dispatch(primary)}
          >
            <Play size={14} className="mr-1" />
            {primary.label}
          </Button>
        )}
      </div>

      {record.governance && (
        <div className="mt-3">
          <CommandSurfaceGovernanceBanner governance={record.governance} />
        </div>
      )}
    </section>
  );
}
