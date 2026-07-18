import { useMemo, useState } from "react";
import { Copy, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";
import type { DealStructure, InfluencerDeal } from "@shared/cmoInfluencerOperator";
import { generateCreatorUtm, touchDisplayLabel } from "@shared/cmoInfluencerOperator";

export function InfluencerDealModal() {
  const touchId = useApp((s) => s.pendingInfluencerDealTouchId);
  const operator = useApp((s) => s.influencerOperator);
  const dismiss = useApp((s) => s.dismissInfluencerDealModal);
  const complete = useApp((s) => s.completeInfluencerTouch);
  const [structure, setStructure] = useState<DealStructure>("affiliate_only");
  const [promoCode, setPromoCode] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [disclosureAck, setDisclosureAck] = useState(false);
  const [baseComp, setBaseComp] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const touch = useMemo(
    () => (touchId && operator ? operator.touches.find((t) => t.id === touchId) : undefined),
    [touchId, operator],
  );

  if (!touchId || !touch || !operator) return null;

  const utmDefaults = touch.target_handle
    ? generateCreatorUtm(touch.target_handle)
    : { utm_campaign: "", promo_code: "", utm_link: "" };

  const deal: InfluencerDeal = {
    structure,
    base_comp_usd: baseComp ? Number(baseComp) : undefined,
    promo_code: promoCode.trim() || utmDefaults.promo_code,
    utm_campaign: utmCampaign.trim() || utmDefaults.utm_campaign,
    utm_link: utmDefaults.utm_link,
    disclosure_ack: disclosureAck,
  };

  const handleSubmit = () => {
    const err = complete(touch.id, "brief_sent", {}, deal);
    if (err) {
      setSubmitError(err);
      return;
    }
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      data-testid="influencer-deal-modal"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-body-sm font-semibold text-text">Deal + UTM</h2>
            <p className="mt-1 text-mini text-text-2">{touchDisplayLabel(operator, touch)}</p>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Base compensation USD
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={baseComp}
              placeholder={touch.cost_estimate_usd != null ? `Budget estimate: $${touch.cost_estimate_usd}` : "$0"}
              className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
              onChange={(e) => setBaseComp(e.target.value)}
            />
          </div>
          <button type="button" className="text-text-3 hover:text-text" onClick={dismiss}>
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Deal structure
            </label>
            <select
              value={structure}
              className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
              onChange={(e) => setStructure(e.target.value as DealStructure)}
            >
              <option value="affiliate_only">Affiliate only</option>
              <option value="product_for_post">Product for post</option>
              <option value="base_plus_cpa">Base + CPA</option>
              <option value="flat_fee">Flat fee</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              Promo code
            </label>
            <input
              value={promoCode || utmDefaults.promo_code}
              className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
              onChange={(e) => setPromoCode(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
              UTM campaign
            </label>
            <input
              value={utmCampaign || utmDefaults.utm_campaign}
              className="mt-1.5 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-1.5 text-body-sm"
              onChange={(e) => setUtmCampaign(e.target.value)}
            />
          </div>
          <div className="rounded-[var(--radius-md)] bg-surface-2 p-2 text-mini text-text-2">
            <span className="font-medium text-text">Tracking link:</span> {utmDefaults.utm_link}
            <button
              type="button"
              className="ml-2 inline-flex items-center gap-1 text-accent hover:underline"
              onClick={() => void navigator.clipboard.writeText(utmDefaults.utm_link)}
            >
              <Copy size={12} /> Copy
            </button>
          </div>
          <label className="flex items-center gap-2 text-mini text-text-2">
            <input
              type="checkbox"
              checked={disclosureAck}
              onChange={(e) => setDisclosureAck(e.target.checked)}
            />
            Brief includes #ad / paid partnership disclosure
          </label>
        </div>
        {submitError && <p className="mt-2 text-mini text-warn">{submitError}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Save deal
          </Button>
        </div>
      </div>
    </div>
  );
}
