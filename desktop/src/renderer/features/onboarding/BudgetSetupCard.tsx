import { useMemo, useState } from "react";
import { DollarSign } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";
import { buildBudgetAllocation } from "@shared/cmoBudgetPlane";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";

export function BudgetSetupCard() {
  const profile = useApp((s) => s.marketingProfile);
  const thesis = useApp((s) => s.channelThesis ?? s.marketingProfile?.channel_thesis);
  const budgetPlan = useApp((s) => s.budgetPlan ?? s.marketingProfile?.budget_plan);
  const saveBudgetPlan = useApp((s) => s.saveBudgetPlan);
  const [amount, setAmount] = useState("");
  const [cpa, setCpa] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!thesis || !profile?.founder_fit) return null;
    return buildBudgetAllocation(thesis, profile.founder_fit, {
      monthlyAmountUsd: amount === "" ? undefined : Number(amount),
      cpaCeilingUsd: cpa === "" ? undefined : Number(cpa),
    });
  }, [amount, cpa, profile?.founder_fit, thesis]);

  if (!profile || !thesis || !profile.founder_fit || budgetPlan || !isStrategicDecisionSealed(profile)) {
    return null;
  }

  const submit = () => {
    const ok = saveBudgetPlan(
      amount === "" ? undefined : Number(amount),
      cpa === "" ? undefined : Number(cpa),
    );
    setError(ok ? null : "Enter a non-negative monthly amount.");
  };

  return (
    <Card data-testid="budget-setup-card" className="p-4">
      <div className="flex items-center gap-2">
        <DollarSign size={15} className="text-accent" />
        <h3 className="text-body-sm font-semibold text-text">Set the money boundary</h3>
      </div>
      <p className="mt-1 text-mini text-text-2">
        Confirm cash you can actually invest. Leave blank to use the {profile.founder_fit.monthly_budget_band} band estimate, labeled assumption.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[10px] uppercase text-text-3">
          Monthly USD
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            placeholder={`Band estimate: $${preview?.monthly_amount_usd ?? 0}`}
            className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="text-[10px] uppercase text-text-3">
          CPA ceiling USD (optional)
          <input
            type="number"
            min={0}
            step="0.01"
            value={cpa}
            placeholder="No default judgment"
            className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
            onChange={(event) => setCpa(event.target.value)}
          />
        </label>
      </div>
      {preview && (
        <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-text-2">
          {preview.allocations.filter((row) => row.pct > 0).map((row) => (
            <div key={row.bucket_id} className="rounded bg-surface-2 p-2">
              <div>{row.bucket_id.replace(/_/g, " ")}</div>
              <div className="font-mono text-text">${row.amount_usd} · {row.pct}%</div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] text-text-3">
        Estimates are planning boundaries. Only logged actuals count as spend; CPA appears only with measured spend and outcomes.
      </p>
      {error && <p className="mt-2 text-mini text-warn">{error}</p>}
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="primary" onClick={submit}>
          {amount === "" ? "Use band estimate" : "Confirm budget"}
        </Button>
      </div>
    </Card>
  );
}
