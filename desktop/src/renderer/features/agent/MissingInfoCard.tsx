import { useMemo, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { MarketingProfile } from "@shared/types";

/** Human-readable label + helper text for each strategic profile gap. */
const QUESTIONS: Record<
  string,
  { label: string; placeholder: string; commit: (v: string) => Partial<MarketingProfile> }
> = {
  product_name: {
    label: "What's the product called?",
    placeholder: "e.g. Marketing IDE",
    commit: (v) => ({ product_name: v.trim() }),
  },
  main_value_proposition: {
    label: "In one sentence, what does it do for the user?",
    placeholder: "We help founders ship and launch their products faster.",
    commit: (v) => ({ main_value_proposition: v.trim() }),
  },
  target_audience: {
    label: "Who's it for?",
    placeholder: "e.g. solo founders shipping AI products",
    commit: (v) => ({
      target_audience: [
        {
          persona: v.trim(),
          pains: [],
          jobs: [],
        },
      ],
    }),
  },
  company_stage: {
    label: "What stage is it at?",
    placeholder: "idea / prelaunch / launched / growing / scaling",
    commit: (v) => {
      const t = v.trim().toLowerCase();
      const allowed = ["idea", "prelaunch", "launched", "growing", "scaling"] as const;
      const match = allowed.find((s) => t.includes(s));
      return match ? { company_stage: match } : {};
    },
  },
  differentiators: {
    label: "What makes it different from alternatives?",
    placeholder: "One or two short phrases, comma-separated",
    commit: (v) => ({
      differentiators: v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }),
  },
};

/** True when the marketing profile has an unanswered strategic gap to ask about. */
export function useNextProfileGap(): string | null {
  const profile = useApp((s) => s.marketingProfile);
  return useMemo(() => {
    const gaps = profile?.strategic_gaps?.length
      ? profile.strategic_gaps
      : profile?.gaps;
    if (!gaps?.length) return null;
    return gaps.find((g) => g in QUESTIONS) ?? null;
  }, [profile]);
}

/**
 * Inline progressive-enrichment card. Surfaces the next missing strategic field
 * (max one at a time so users aren't ambushed by a form) and writes the answer
 * straight back to the marketing profile.
 */
export function MissingInfoCard() {
  const profile = useApp((s) => s.marketingProfile);
  const update = useApp((s) => s.updateMarketingProfile);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [value, setValue] = useState("");

  const nextGap = useMemo(() => {
    const gaps = profile?.strategic_gaps?.length
      ? profile.strategic_gaps
      : profile?.gaps;
    if (!gaps?.length) return null;
    return gaps.find((g) => !skipped.has(g) && g in QUESTIONS) ?? null;
  }, [profile, skipped]);

  if (!profile || !nextGap) return null;
  const q = QUESTIONS[nextGap];

  const submit = () => {
    if (!value.trim()) return;
    const patch = q.commit(value);
    if (Object.keys(patch).length > 0) {
      void update(patch);
      setSkipped((s) => new Set(s).add(nextGap));
    }
    setValue("");
  };

  return (
    <div className="w-full max-w-full rounded-[var(--radius-lg)] border border-line bg-surface-2 p-3">
      <div className="mb-1.5 flex items-center gap-2 text-mini text-text-2">
        <Sparkles size={13} className="text-accent" />
        Quick — so I can answer specifically for your product
      </div>
      <div className="text-body-sm font-medium text-text">{q.label}</div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={q.placeholder}
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-1.5 text-body-sm text-text outline-none focus:border-[var(--accent-border)]"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="btn-accent flex h-7 items-center gap-1 rounded-[var(--radius-md)] px-3 text-mini disabled:opacity-40"
        >
          Save <ArrowRight size={12} />
        </button>
        <button
          onClick={() => setSkipped((s) => new Set(s).add(nextGap))}
          className="flex h-7 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-micro text-text-3 transition-colors hover:text-text"
          title="Skip for now"
        >
          <X size={12} /> Skip
        </button>
      </div>
    </div>
  );
}
