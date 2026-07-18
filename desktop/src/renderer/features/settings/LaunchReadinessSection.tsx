/**
 * Launch readiness fields — email list size drives PH aggression playbook selection.
 */
import { useApp } from "@renderer/state/store";
import { Field } from "@renderer/components/ui/Field";

export function LaunchReadinessSection() {
  const profile = useApp((s) => s.marketingProfile);
  const update = useApp((s) => s.updateMarketingProfile);

  const emailList = profile?.email_list_size ?? "";
  const daysLaunch = profile?.days_until_launch ?? "";
  const pipelineEmpty = profile?.sales_pipeline_empty ?? false;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
      <div>
        <div className="text-body-sm font-medium text-text">Launch readiness</div>
        <p className="text-caption text-text-3">
          Powers honest aggression dial and PH playbook selection (aggressive-top-1 needs 5k+ list).
        </p>
      </div>
      <Field label="Engaged email list size" hint="Subscribers who open emails — not total contacts.">
        <input
          type="number"
          min={0}
          className="w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1.5 text-body-sm"
          value={emailList}
          placeholder="e.g. 500"
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            void update({ email_list_size: Number.isFinite(v) ? v : undefined });
          }}
        />
      </Field>
      <Field label="Days until launch" hint="Planned PH or public launch date.">
        <input
          type="number"
          min={0}
          className="w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1.5 text-body-sm"
          value={daysLaunch}
          placeholder="e.g. 21"
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            void update({ days_until_launch: Number.isFinite(v) ? v : undefined });
          }}
        />
      </Field>
      <label className="flex items-center gap-2 text-body-sm text-text-2">
        <input
          type="checkbox"
          checked={pipelineEmpty}
          onChange={(e) => void update({ sales_pipeline_empty: e.target.checked })}
        />
        Sales pipeline empty (use outbound research playbooks)
      </label>
    </div>
  );
}
