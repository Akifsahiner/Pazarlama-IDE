import type { ManualKpi } from "./types";

export interface KpiPreset {
  id: string;
  label: string;
  name: string;
  unit?: string;
  channel?: string;
  defaultTarget?: number;
}

export const KPI_PRESETS: KpiPreset[] = [
  {
    id: "waitlist_signups",
    label: "Waitlist signups",
    name: "Waitlist signups",
    unit: "signups",
    channel: "waitlist-hype",
    defaultTarget: 100,
  },
  {
    id: "ph_upvotes",
    label: "PH upvotes",
    name: "Product Hunt upvotes",
    unit: "upvotes",
    channel: "ph-launch",
    defaultTarget: 50,
  },
  {
    id: "linkedin_impressions",
    label: "LinkedIn impressions",
    name: "LinkedIn impressions",
    unit: "impressions",
    channel: "linkedin-gtm",
  },
  {
    id: "paid_spend",
    label: "Ad spend",
    name: "Paid ad spend",
    unit: "€",
    channel: "paid-ads-opt",
  },
];

/** Map task titles / KPI names to a preset for quick logging CTAs. */
export function inferKpiPresetFromText(text?: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/waitlist|signup/.test(t)) return "waitlist_signups";
  if (/product hunt|\bph\b|upvote/.test(t)) return "ph_upvotes";
  if (/linkedin|impression/.test(t)) return "linkedin_impressions";
  if (/spend|paid ad|ads budget/.test(t)) return "paid_spend";
  return null;
}

export function kpiFromPreset(presetId: string, value: number, target?: number): ManualKpi | null {
  const preset = KPI_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  return {
    id: preset.id,
    name: preset.name,
    value,
    target: target ?? preset.defaultTarget,
    unit: preset.unit,
    channel: preset.channel,
    updated_at: new Date().toISOString(),
    source: "manual",
  };
}
