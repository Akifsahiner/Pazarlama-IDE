import { useEffect, useRef, useState } from "react";
import { BarChart3, Trash2 } from "lucide-react";
import { KPI_PRESETS, kpiFromPreset } from "@shared/kpiPresets";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { Field, Input } from "@renderer/components/ui/Field";

export function KpiLogCard({ defaultPresetId }: { defaultPresetId?: string }) {
  const upsertManualKpi = useApp((s) => s.upsertManualKpi);
  const deleteManualKpi = useApp((s) => s.deleteManualKpi);
  const profile = useApp((s) => s.marketingProfile);
  const [presetId, setPresetId] = useState(defaultPresetId ?? KPI_PRESETS[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const preset = KPI_PRESETS.find((p) => p.id === presetId);
  const existing = profile?.manual_kpis?.find((k) => k.id === presetId);

  useEffect(() => {
    if (!defaultPresetId) return;
    setPresetId(defaultPresetId);
    const hit = profile?.manual_kpis?.find((k) => k.id === defaultPresetId);
    if (hit) setValue(String(hit.value));
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [defaultPresetId, profile?.manual_kpis]);

  useEffect(() => {
    if (!presetId) return;
    const hit = profile?.manual_kpis?.find((k) => k.id === presetId);
    if (hit && !value) setValue(String(hit.value));
  }, [presetId, profile?.manual_kpis, value]);

  const save = async () => {
    const num = Number(value);
    if (!preset || Number.isNaN(num)) return;
    setBusy(true);
    setSavedMsg(null);
    try {
      const kpi = kpiFromPreset(
        presetId,
        num,
        target.trim() ? Number(target) : existing?.target ?? preset.defaultTarget,
      );
      if (kpi) {
        const ok = await upsertManualKpi(kpi);
        if (ok) setSavedMsg(`${preset.label} saved — visible in Command Center.`);
        else setSavedMsg("Could not save KPI — open a project first.");
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (!window.confirm(`Remove logged ${preset?.label ?? "KPI"}?`)) return;
    setBusy(true);
    try {
      await deleteManualKpi(presetId);
      setValue("");
      setTarget("");
      setSavedMsg(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      id="kpi-log-card"
      ref={rootRef}
      className="rounded-[var(--radius-md)] border border-line bg-surface-2/80 p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-text-3">
        <BarChart3 size={14} className="text-accent" /> Log launch KPI
      </div>
      <div className="flex flex-wrap gap-2">
        {KPI_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPresetId(p.id);
              setSavedMsg(null);
              const hit = profile?.manual_kpis?.find((k) => k.id === p.id);
              setValue(hit ? String(hit.value) : "");
              setTarget(hit?.target != null ? String(hit.target) : "");
            }}
            className={`rounded-[var(--radius-sm)] border px-2.5 py-1 text-mini transition-colors ${
              presetId === p.id
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-line text-text-2 hover:bg-elevated"
            }`}
          >
            {p.label}
            {profile?.manual_kpis?.some((k) => k.id === p.id) && (
              <span className="ml-1 text-ok">✓</span>
            )}
          </button>
        ))}
      </div>
      {preset && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label={`${preset.label} (actual)`}>
            <Input
              type="number"
              value={value}
              placeholder={existing ? String(existing.value) : "0"}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label="Target (optional)">
            <Input
              type="number"
              value={target}
              placeholder={String(existing?.target ?? preset.defaultTarget ?? "")}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <Button variant="secondary" size="sm" loading={busy} disabled={!value.trim()} onClick={() => void save()}>
              Save KPI
            </Button>
            {existing && (
              <Button variant="ghost" size="sm" iconLeft={<Trash2 size={12} />} disabled={busy} onClick={() => void remove()}>
                Remove
              </Button>
            )}
          </div>
        </div>
      )}
      {savedMsg && (
        <p className={`mt-2 text-caption ${savedMsg.startsWith("Could not") ? "text-danger" : "text-ok"}`}>
          {savedMsg}
        </p>
      )}
      <p className="mt-2 text-caption text-text-3">
        Manual entries show a green <strong>Logged</strong> badge in Channel progress — never fabricated.
      </p>
    </div>
  );
}
