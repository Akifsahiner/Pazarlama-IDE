/**
 * Part 6 — profile / founder-fit / user answers → claims.
 */
import type { MarketingProfile } from "./types";
import {
  createEvidenceRef,
  type ProductClaim,
} from "./productUnderstandingInput";

const NOW = () => new Date().toISOString();

function userRef(field: string, label: string) {
  return createEvidenceRef({
    kind: "user_answer",
    label,
    ref: field,
  });
}

function claimFromProfile(
  dimension: ProductClaim["dimension"],
  value: string | number | boolean | null,
  confidence: ProductClaim["confidence"],
  evidence: ProductClaim["evidence"],
): ProductClaim {
  return { dimension, value, confidence, evidence, updated_at: NOW() };
}

export function buildClaimsFromProfile(profile: MarketingProfile): ProductClaim[] {
  const claims: ProductClaim[] = [];

  if (profile.business_model) {
    claims.push(
      claimFromProfile(
        "business_model",
        profile.business_model,
        "measured",
        [userRef("profile.business_model", `Business model: ${profile.business_model}`)],
      ),
    );
  } else {
    claims.push(claimFromProfile("business_model", null, "missing", []));
  }

  if (profile.price_range) {
    const pr = profile.price_range;
    claims.push(
      claimFromProfile(
        "pricing",
        `${pr.low}-${pr.high} ${pr.currency}`,
        "measured",
        [userRef("profile.price_range", "User-provided price range")],
      ),
    );
  }

  if (profile.target_audience?.length) {
    const persona = profile.target_audience[0]!.persona;
    claims.push(
      claimFromProfile("target_user", persona, "measured", [
        userRef("profile.target_audience", "User-provided ICP"),
      ]),
    );
  } else {
    claims.push(claimFromProfile("target_user", null, "missing", []));
  }

  if (profile.competitors?.length) {
    const withSource = profile.competitors.filter((c) => c.url || c.note);
    const confidence = withSource.length === profile.competitors.length ? "measured" : "needs_confirmation";
    claims.push(
      claimFromProfile(
        "competitors_alternatives",
        profile.competitors.map((c) => c.name).join(", "),
        confidence,
        profile.competitors.map((c, i) =>
          createEvidenceRef({
            kind: c.url ? "live_url" : "user_answer",
            label: c.name,
            ref: c.url ?? `profile.competitors[${i}]`,
          }),
        ),
      ),
    );
  } else {
    claims.push(claimFromProfile("competitors_alternatives", null, "missing", []));
  }

  const assets = profile.available_assets ?? [];
  const proof = profile.existing_proof ?? [];
  if (assets.length || proof.length) {
    claims.push(
      claimFromProfile(
        "distribution_assets",
        [...assets, ...proof].slice(0, 8).join("; "),
        proof.length ? "measured" : "assumption",
        [
          ...assets.slice(0, 4).map((a) =>
            createEvidenceRef({
              kind: "scan_heuristic",
              label: a,
              ref: a,
              rule_id: "profile.available_assets",
            }),
          ),
          ...proof.slice(0, 2).map((p, i) =>
            createEvidenceRef({
              kind: "user_answer",
              label: p,
              ref: `profile.existing_proof[${i}]`,
            }),
          ),
        ],
      ),
    );
  } else {
    claims.push(claimFromProfile("distribution_assets", null, "missing", []));
  }

  const ff = profile.founder_fit;
  if (ff?.completed_at) {
    claims.push(
      claimFromProfile(
        "founder_constraints",
        `${ff.weekly_marketing_hours} · ${ff.monthly_budget_band} · brand ${ff.brand_face_readiness}`,
        "measured",
        [
          userRef("founder_fit.weekly_marketing_hours", "Founder fit wizard"),
          userRef("founder_fit.monthly_budget_band", "Budget band"),
          userRef("founder_fit.brand_face_readiness", "Brand visibility"),
        ],
      ),
    );
  } else {
    claims.push(claimFromProfile("founder_constraints", null, "missing", []));
  }

  const activation = profile.product_activation;
  if (activation?.activation_event_label) {
    claims.push(
      claimFromProfile(
        "activation_event",
        activation.activation_event_label,
        activation.confidence === "measured" ? "measured" : "assumption",
        [userRef("product_activation.activation_event_label", "Activation intake")],
      ),
    );
  }

  const ga4 = profile.connector_snapshots?.ga4;
  const manual = profile.manual_kpis?.length;
  if (ga4?.fetched_at || manual) {
    claims.push(
      claimFromProfile(
        "traffic_analytics",
        ga4 ? "ga4_connected" : "manual_kpi",
        "measured",
        [
          createEvidenceRef({
            kind: "analytics_snapshot",
            label: ga4 ? "GA4 snapshot" : "Manual KPI logged",
            ref: ga4 ? "connector_snapshots.ga4" : "manual_kpis",
            captured_at: ga4?.fetched_at,
          }),
        ],
      ),
    );
  }

  return claims;
}

export function splitStrategicGaps(profile: MarketingProfile): string[] {
  const STRATEGIC = new Set([
    "product_name",
    "main_value_proposition",
    "target_audience",
    "company_stage",
    "differentiators",
  ]);
  const scanPrefixes = ["tracking.", "stack.", "product.", "revenue.", "growth."];
  return (profile.gaps ?? []).filter(
    (g) => !scanPrefixes.some((p) => g.startsWith(p)) && !STRATEGIC.has(g),
  );
}

export function computeStrategicGaps(profile: MarketingProfile): string[] {
  const gaps: string[] = [];
  if (!profile.product_name?.trim()) gaps.push("product_name");
  if (!profile.main_value_proposition?.trim()) gaps.push("main_value_proposition");
  if (!profile.target_audience?.length) gaps.push("target_audience");
  if (!profile.company_stage?.trim()) gaps.push("company_stage");
  if (!profile.differentiators?.length) gaps.push("differentiators");
  return gaps;
}
