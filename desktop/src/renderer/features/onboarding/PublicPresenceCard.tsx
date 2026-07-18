import { useMemo, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import {
  defaultPublicPresencePolicy,
  type PublicPresencePolicy,
} from "@shared/cmoGrowthEngine";
import type { FounderFitProfile } from "@shared/types";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { Card } from "@renderer/components/ui/Card";

type AssetKey = keyof Omit<PublicPresencePolicy, "reputational_risk" | "configured_at">;

const ASSET_ROWS: Array<{
  key: AssetKey;
  label: string;
  helper: string;
}> = [
  {
    key: "founder",
    label: "Founder face",
    helper: "Short-form, founder story, or demo on camera.",
  },
  {
    key: "employees",
    label: "Team members",
    helper: "Technical demos, webinars, or employee-led posts.",
  },
  {
    key: "brand_character",
    label: "Brand character / mascot",
    helper: "In-character content tied to product tension — not random dances.",
  },
  {
    key: "customers",
    label: "Customers & testimonials",
    helper: "Case studies, UGC, and customer proof on public channels.",
  },
  {
    key: "creators",
    label: "Creators & affiliates",
    helper: "Sponsored creators, affiliate partners, or delegated creative.",
  },
  {
    key: "voice_only",
    label: "Voice-only / written",
    helper: "Podcast, written interviews — no face required.",
  },
  {
    key: "product_as_hero",
    label: "Product-as-hero",
    helper: "Demos, screen recordings, and product-led visuals.",
  },
  {
    key: "user_generated_output",
    label: "User-generated output",
    helper: "Shareable artifacts users create inside the product.",
  },
  {
    key: "proprietary_data",
    label: "Proprietary data stories",
    helper: "Anonymized benchmarks, research, or category reports.",
  },
  {
    key: "community",
    label: "Community surface",
    helper: "Discord, forum, or owned community as distribution.",
  },
  {
    key: "partners",
    label: "Integration partners",
    helper: "Co-marketing with adjacent tools and ecosystems.",
  },
];

function toggleAsset(
  policy: PublicPresencePolicy,
  key: AssetKey,
  allowed: boolean,
): PublicPresencePolicy {
  return {
    ...policy,
    [key]: { ...policy[key], allowed },
  };
}

export function PublicPresenceCard({
  founderFit,
  initial,
  onComplete,
}: {
  founderFit: FounderFitProfile;
  initial?: PublicPresencePolicy;
  onComplete: (policy: PublicPresencePolicy) => void;
}) {
  const [policy, setPolicy] = useState<PublicPresencePolicy>(
    initial ?? defaultPublicPresencePolicy(founderFit),
  );
  const allowedCount = useMemo(
    () => ASSET_ROWS.filter((row) => policy[row.key].allowed).length,
    [policy],
  );

  const finish = () => {
    onComplete({
      ...policy,
      configured_at: new Date().toISOString(),
    });
  };

  return (
    <Card
      className="border-accent/30 bg-accent-soft/10"
      role="region"
      aria-label="Public presence policy"
      data-testid="public-presence-card"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
          <Users size={13} />
          Public presence
        </div>
        <Badge tone="neutral">{allowedCount} assets allowed</Badge>
      </div>
      <h2 className="mt-4 text-h3 text-text">Who can represent this product publicly?</h2>
      <p className="mt-1 text-body-sm text-text-2">
        The CMO uses this to pick growth physics — not every product should copy founder-led viral
        content. Toggle what is honestly available in Week 1.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {ASSET_ROWS.map((row) => {
          const active = policy[row.key].allowed;
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => setPolicy((current) => toggleAsset(current, row.key, !active))}
              aria-pressed={active}
              className={`rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
                active
                  ? "border-accent bg-accent-soft/50"
                  : "border-line bg-surface hover:border-accent/40"
              }`}
              data-testid={`presence-asset-${row.key}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-body-sm font-medium text-text">{row.label}</span>
                <Badge tone={active ? "ok" : "neutral"}>{active ? "Allowed" : "Off"}</Badge>
              </div>
              <p className="mt-1 text-[10px] text-text-3">{row.helper}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
          Reputational risk tolerance
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["low", "medium", "high"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPolicy((current) => ({ ...current, reputational_risk: level }))}
              className={`rounded-full border px-3 py-1 text-mini capitalize ${
                policy.reputational_risk === level
                  ? "border-accent bg-accent-soft text-text"
                  : "border-line text-text-2"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          variant="primary"
          onClick={finish}
          iconRight={<ArrowRight size={15} />}
          data-testid="public-presence-continue"
        >
          Continue to strategic options
        </Button>
      </div>
    </Card>
  );
}
