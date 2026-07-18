import { useState } from "react";
import { Gauge } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";

function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

export function ProductActivationCard() {
  const profile = useApp((state) => state.marketingProfile);
  const budget = useApp((state) => state.budgetPlan ?? state.marketingProfile?.budget_plan);
  const activation = useApp(
    (state) => state.productActivation ?? state.marketingProfile?.product_activation,
  );
  const save = useApp((state) => state.saveProductActivation);
  const [eventLabel, setEventLabel] = useState(profile?.founder_fit?.magic_moment ?? "");
  const [signups, setSignups] = useState("");
  const [activated, setActivated] = useState("");
  const [rateTarget, setRateTarget] = useState("40");
  const [ttfv, setTtfv] = useState("");
  const [ttfvTarget, setTtfvTarget] = useState("");
  const [onboarding, setOnboarding] = useState<"" | "yes" | "no">("");
  const [error, setError] = useState<string | null>(null);

  if (!profile || !budget || activation || !isStrategicDecisionSealed(profile)) return null;

  const submit = () => {
    if (eventLabel.trim().length < 3) {
      setError("Define the first concrete value event.");
      return;
    }
    const values = [signups, activated, rateTarget, ttfv, ttfvTarget]
      .filter((value) => value !== "")
      .map(Number);
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      setError("Metrics must be non-negative numbers.");
      return;
    }
    const ok = save({
      activation_event_label: eventLabel.trim(),
      signup_count: optionalNumber(signups),
      activated_count: optionalNumber(activated),
      activation_rate_target_pct: optionalNumber(rateTarget),
      ttfv_hours: optionalNumber(ttfv),
      ttfv_target_hours: optionalNumber(ttfvTarget),
      onboarding_path_exists: onboarding === "" ? undefined : onboarding === "yes",
    });
    setError(ok ? null : "Could not save activation intake.");
  };

  return (
    <Card data-testid="product-activation-card" className="p-4">
      <div className="flex items-center gap-2">
        <Gauge size={15} className="text-accent" />
        <h3 className="text-body-sm font-semibold text-text">Define first value before scale</h3>
      </div>
      <p className="mt-1 text-mini text-text-2">
        These inputs decide whether marketing runs or pauses for a P0 product loop. Missing values
        stay missing; the app never invents activation performance.
      </p>
      <label className="mt-3 block text-[10px] uppercase text-text-3">
        Activation event
        <input
          value={eventLabel}
          placeholder="Creates the first useful project"
          className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
          onChange={(event) => setEventLabel(event.target.value)}
        />
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
        {[
          ["Signups", signups, setSignups, "Optional"],
          ["Activated users", activated, setActivated, "Optional"],
          ["Activation target %", rateTarget, setRateTarget, "40 assumption"],
          ["Current TTFV hours", ttfv, setTtfv, "Optional"],
          ["Target TTFV hours", ttfvTarget, setTtfvTarget, "Optional"],
        ].map(([label, value, setter, placeholder]) => (
          <label key={label as string} className="text-[10px] uppercase text-text-3">
            {label as string}
            <input
              type="number"
              min={0}
              step="0.1"
              value={value as string}
              placeholder={placeholder as string}
              className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
              onChange={(event) =>
                (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)
              }
            />
          </label>
        ))}
        <label className="text-[10px] uppercase text-text-3">
          Onboarding path
          <select
            value={onboarding}
            className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
            onChange={(event) => setOnboarding(event.target.value as "" | "yes" | "no")}
          >
            <option value="">Use repo scan</option>
            <option value="yes">Exists</option>
            <option value="no">Missing</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-[10px] text-text-3">
        The 40% target is an assumption until you enter your own target. It is not an industry
        benchmark.
      </p>
      {error && <p className="mt-2 text-mini text-warn">{error}</p>}
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="primary" onClick={submit}>
          Save activation gate
        </Button>
      </div>
    </Card>
  );
}
