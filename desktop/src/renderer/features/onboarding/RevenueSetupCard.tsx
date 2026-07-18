import { useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";
import {
  buildRevenueProfile,
  buildRevenueScanSignals,
  inferPricingThesis,
  type MonetizationModel,
  type PaymentProvider,
} from "@shared/cmoRevenuePlane";
import { isStrategicDecisionSealed } from "@shared/cmoStrategicOptions";

function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

const MODEL_OPTIONS: MonetizationModel[] = [
  "plg_self_serve",
  "sales_led",
  "hybrid",
  "usage_based",
  "freemium",
  "not_yet",
];

const PROVIDER_OPTIONS: PaymentProvider[] = [
  "stripe",
  "paddle",
  "lemon_squeezy",
  "manual_invoicing",
  "none_detected",
];

export function RevenueSetupCard() {
  const profile = useApp((state) => state.marketingProfile);
  const settings = useApp((state) => state.settings);
  const project = useApp((state) => state.project);
  const budget = useApp((state) => state.budgetPlan ?? state.marketingProfile?.budget_plan);
  const activation = useApp(
    (state) => state.productActivation ?? state.marketingProfile?.product_activation,
  );
  const revenue = useApp((state) => state.revenueProfile ?? state.marketingProfile?.revenue_profile);
  const save = useApp((state) => state.saveRevenueProfile);
  const [modelOverride, setModelOverride] = useState<MonetizationModel | "">("");
  const [provider, setProvider] = useState<PaymentProvider | "">("");
  const [paidCustomers, setPaidCustomers] = useState("");
  const [mrr, setMrr] = useState("");
  const [ltv, setLtv] = useState("");
  const [pricingViews, setPricingViews] = useState("");
  const [checkoutStarts, setCheckoutStarts] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scan = useMemo(
    () => buildRevenueScanSignals(project, profile?.gaps),
    [project, profile?.gaps],
  );

  const thesisPreview = useMemo(
    () =>
      inferPricingThesis({
        scan,
        founderFit: profile?.founder_fit,
        persona: settings.persona,
      }),
    [scan, profile?.founder_fit, settings.persona],
  );

  const preview = useMemo(() => {
    if (!profile?.founder_fit) return null;
    return buildRevenueProfile({
      scan,
      founderFit: profile.founder_fit,
      strategicDecision: profile.strategic_decision,
      manualKpis: profile.manual_kpis,
      intake: {
        modelOverride: modelOverride || undefined,
        paymentProvider: provider || undefined,
        paidCustomers: optionalNumber(paidCustomers),
        mrrUsd: optionalNumber(mrr),
        ltvUsd: optionalNumber(ltv),
        pricingViews: optionalNumber(pricingViews),
        checkoutStarts: optionalNumber(checkoutStarts),
      },
    });
  }, [
    checkoutStarts,
    ltv,
    modelOverride,
    mrr,
    paidCustomers,
    pricingViews,
    profile,
    provider,
    scan,
  ]);

  if (!profile || !budget || !activation || revenue || !isStrategicDecisionSealed(profile)) {
    return null;
  }

  const submit = () => {
    const values = [paidCustomers, mrr, ltv, pricingViews, checkoutStarts]
      .filter((value) => value !== "")
      .map(Number);
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      setError("Metrics must be non-negative numbers.");
      return;
    }
    const ok = save({
      modelOverride: modelOverride || undefined,
      paymentProvider: provider || undefined,
      paidCustomers: optionalNumber(paidCustomers),
      mrrUsd: optionalNumber(mrr),
      ltvUsd: optionalNumber(ltv),
      pricingViews: optionalNumber(pricingViews),
      checkoutStarts: optionalNumber(checkoutStarts),
    });
    setError(ok ? null : "Could not save revenue intake.");
  };

  const ambiguous = thesisPreview.model === "hybrid" || thesisPreview.model === "not_yet";

  return (
    <Card data-testid="revenue-setup-card" className="p-4">
      <div className="flex items-center gap-2">
        <CreditCard size={15} className="text-accent" />
        <h3 className="text-body-sm font-semibold text-text">How will you get paid?</h3>
      </div>
      <p className="mt-1 text-mini text-text-2">
        Pricing thesis, payment funnel, and revenue target — all labeled measured or assumption. No invented MRR.
      </p>

      <div className="mt-3 rounded bg-surface-2 p-3 text-[10px] text-text-2">
        <div className="font-medium text-text">{thesisPreview.headline}</div>
        <div className="mt-1 uppercase text-text-3">{thesisPreview.confidence}</div>
        <ul className="mt-2 list-disc pl-4">
          {thesisPreview.rationale.slice(0, 2).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {ambiguous && (
        <label className="mt-3 block text-[10px] uppercase text-text-3">
          Confirm monetization model
          <select
            value={modelOverride || thesisPreview.model}
            className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
            onChange={(event) => setModelOverride(event.target.value as MonetizationModel)}
          >
            {MODEL_OPTIONS.map((model) => (
              <option key={model} value={model}>
                {model.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="mt-3 block text-[10px] uppercase text-text-3">
        Payment provider (confirm scan)
        <select
          value={provider || preview?.payment_provider || "none_detected"}
          className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
          onChange={(event) => setProvider(event.target.value as PaymentProvider)}
        >
          {PROVIDER_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[10px] uppercase text-text-3">
          Paying customers (baseline)
          <input
            type="number"
            min={0}
            value={paidCustomers}
            placeholder="0 if none yet"
            className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
            onChange={(event) => setPaidCustomers(event.target.value)}
          />
        </label>
        <label className="text-[10px] uppercase text-text-3">
          MRR USD (optional, measured)
          <input
            type="number"
            min={0}
            step="0.01"
            value={mrr}
            className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
            onChange={(event) => setMrr(event.target.value)}
          />
        </label>
        <label className="text-[10px] uppercase text-text-3">
          LTV USD (optional, measured)
          <input
            type="number"
            min={0}
            step="0.01"
            value={ltv}
            className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
            onChange={(event) => setLtv(event.target.value)}
          />
        </label>
        <label className="text-[10px] uppercase text-text-3">
          Pricing page views
          <input
            type="number"
            min={0}
            value={pricingViews}
            className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
            onChange={(event) => setPricingViews(event.target.value)}
          />
        </label>
        <label className="text-[10px] uppercase text-text-3">
          Checkout starts
          <input
            type="number"
            min={0}
            value={checkoutStarts}
            className="mt-1 w-full rounded border border-line bg-surface-2 px-2 py-1.5 text-body-sm text-text"
            onChange={(event) => setCheckoutStarts(event.target.value)}
          />
        </label>
      </div>

      {preview && (
        <div className="mt-3 rounded bg-surface-2 p-2 text-[10px] text-text-2">
          30-day target:{" "}
          <span className="font-mono text-text">
            {preview.revenue_target.current ?? 0}/{preview.revenue_target.target}{" "}
            {preview.revenue_target.label.toLowerCase()}
          </span>{" "}
          · {preview.revenue_target.confidence}
        </div>
      )}

      {error && <p className="mt-2 text-mini text-danger">{error}</p>}
      <Button className="mt-3 w-full" onClick={submit}>
        Save revenue intake
      </Button>
    </Card>
  );
}
