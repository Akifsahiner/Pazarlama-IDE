/**
 * P13 — Deterministic growth narrative synthesis.
 */
import type {
  FounderFitProfile,
  GrowthNarrative,
  MarketingProfile,
  ProjectProfile,
} from "./types";

type NarrativeClass = "consumer_ai" | "consumer" | "devtool" | "b2b" | "general";

function classify(project: ProjectProfile, profile?: MarketingProfile | null): NarrativeClass {
  const text = [
    project.productType,
    project.readmeSummary,
    profile?.category,
    profile?.product_description,
    profile?.business_model,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const consumer = profile?.business_model === "consumer" || /consumer|b2c|creator|social|mobile/.test(text);
  const ai = /\bai\b|assistant|copilot|agent|overlay/.test(text);
  if (consumer && ai) return "consumer_ai";
  if (consumer) return "consumer";
  if (/developer|devtool|api|sdk|cli|open.?source|github/.test(text)) return "devtool";
  if (profile?.business_model === "saas" || /\bb2b\b|saas|enterprise|team|workspace/.test(text)) {
    return "b2b";
  }
  return "general";
}

function productName(project: ProjectProfile, profile?: MarketingProfile | null): string {
  return profile?.product_name?.trim() || project.name.trim() || "This product";
}

export function synthesizeGrowthNarrative(input: {
  project: ProjectProfile;
  profile?: MarketingProfile | null;
  founderFit: FounderFitProfile;
}): GrowthNarrative {
  const { project, profile, founderFit } = input;
  const name = productName(project, profile);
  const kind = classify(project, profile);
  const controversial = /cheat|undetectable|controvers|polariz|interview coder/i.test(
    `${project.readmeSummary ?? ""} ${profile?.product_description ?? ""}`,
  );

  const templates: Record<NarrativeClass, Omit<GrowthNarrative, "proof_angle" | "signals">> = {
    consumer_ai: controversial
      ? {
          cultural_tension:
            "People already use hidden advantages to perform under pressure, while institutions pretend everyone competes with the same tools.",
          one_liner: `${name} turns the advantage people hide into an immediate, usable result.`,
          enemy_frame: "performative fairness that protects old advantages",
        }
      : {
          cultural_tension:
            "Powerful AI is everywhere, but most people still lose time translating generic output into a useful result.",
          one_liner: `${name} makes AI useful at the exact moment the user needs an outcome.`,
          enemy_frame: "generic AI without a moment of value",
        },
    consumer: {
      cultural_tension:
        "Consumers have more choices than ever, but most products demand attention before proving they deserve it.",
      one_liner: `${name} earns attention by delivering a result before asking for loyalty.`,
      enemy_frame: "attention without earned value",
    },
    devtool: {
      cultural_tension:
        "Developers are promised speed by tools that add setup, abstraction, and another workflow to maintain.",
      one_liner: `${name} removes the work between an idea and a result developers can verify.`,
      enemy_frame: "tools that create more work than they remove",
    },
    b2b: {
      cultural_tension:
        "Teams keep buying software that produces activity dashboards while the painful business outcome stays unchanged.",
      one_liner: `${name} replaces performative activity with a result the team can prove.`,
      enemy_frame: "activity mistaken for progress",
    },
    general: {
      cultural_tension:
        "The market rewards familiar promises even when customers still struggle to reach the outcome they bought.",
      one_liner: `${name} closes the gap between the promise and the result users can feel.`,
      enemy_frame: "promises without proof",
    },
  };

  return {
    ...templates[kind],
    proof_angle: `The proof is the moment a new user ${founderFit.magic_moment.trim()}.`,
    signals: {
      narrative_class: kind,
      product_name: name,
      controversy_tolerance: founderFit.controversy_tolerance,
      brand_face_readiness: founderFit.brand_face_readiness,
      source: project.readmeSummary ? "repo_readme+founder_fit" : "project_profile+founder_fit",
    },
  };
}
