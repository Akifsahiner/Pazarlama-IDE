import {
  BarChart3,
  BookOpen,
  DollarSign,
  Mail,
  Megaphone,
  Rocket,
  Search,
  Share2,
  Target,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { milestonePop } from "@renderer/design/animations";
import type { PlanPlaybook, PlaybookIconKey, PlaybookPhase } from "@shared/planPlaybooks";
import { PLAYBOOK_PHASE_LABEL } from "@shared/planPlaybooks";
import { useApp } from "@renderer/state/store";

const ICONS: Record<PlaybookIconKey, typeof Rocket> = {
  product_hunt: Rocket,
  paid_ads: DollarSign,
  email: Mail,
  content: BookOpen,
  seo: Search,
  social: Share2,
  partnerships: Users,
  analytics: BarChart3,
  sales_outbound: Megaphone,
  landing: Target,
};

const PHASE_TONE: Record<PlaybookPhase, string> = {
  foundation: "text-text-2 border-line",
  warmup: "text-warn border-warn/30",
  launch: "text-accent border-accent/30",
  post_launch: "text-ok border-ok/30",
  always_on: "text-text-3 border-line",
};

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <svg width={36} height={36} className="-rotate-90">
      <circle cx={18} cy={18} r={r} fill="none" stroke="var(--line)" strokeWidth={3} />
      <circle
        cx={18}
        cy={18}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={3}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
      />
      <text
        x={18}
        y={19}
        textAnchor="middle"
        className="rotate-90 fill-text text-[8px] font-medium"
        style={{ transformOrigin: "18px 18px" }}
      >
        {done}/{total}
      </text>
    </svg>
  );
}

export const PLAYBOOK_ACCENT_VAR: Partial<Record<PlaybookIconKey, string>> = {
  product_hunt: "var(--playbook-ph)",
  paid_ads: "var(--playbook-ads)",
  email: "var(--playbook-email)",
  content: "var(--playbook-content)",
  seo: "var(--playbook-seo)",
  sales_outbound: "var(--playbook-sales)",
  analytics: "var(--playbook-analytics)",
  landing: "var(--playbook-landing)",
};
const ACCENT_VAR = PLAYBOOK_ACCENT_VAR;

export function PlaybookCard({
  playbook,
  done,
  total,
  selected,
  celebrate,
  loading,
  blocked,
  skipHint,
  onSelect,
  onStart,
}: {
  playbook: PlanPlaybook | { id: string; title: string; subtitle: string; phase: PlaybookPhase; iconKey: PlaybookIconKey };
  done: number;
  total: number;
  selected?: boolean;
  celebrate?: boolean;
  loading?: boolean;
  blocked?: boolean;
  skipHint?: string;
  onSelect: () => void;
  onStart?: () => void;
}) {
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const Icon = ICONS[playbook.iconKey] ?? Target;
  const connected = useApp((s) => s.runtime === "connected");
  const accent = ACCENT_VAR[playbook.iconKey] ?? "var(--accent)";
  const completed = total > 0 && done >= total;

  return (
    <motion.button
      type="button"
      layout={!reducedMotion}
      variants={celebrate && !reducedMotion ? milestonePop : undefined}
      initial={celebrate && !reducedMotion ? "hidden" : false}
      animate={celebrate && !reducedMotion ? "visible" : undefined}
      onClick={onSelect}
      whileHover={reducedMotion || blocked ? undefined : { y: -2 }}
      className={`flex w-full flex-col rounded-[var(--radius-lg)] border p-4 text-left transition-colors ${
        blocked ? "opacity-60" : ""
      } ${
        selected
          ? "border-accent/50 bg-accent-soft/20 shadow-sm"
          : completed
            ? "border-ok-border/60 bg-ok-soft/20 hover:bg-ok-soft/30"
            : "border-line bg-surface hover:border-accent/30 hover:bg-surface-2"
      } ${loading ? "animate-pulse" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-white"
          style={{ backgroundColor: accent }}
        >
          <Icon size={18} />
        </div>
        {total > 0 ? <ProgressRing done={done} total={total} /> : null}
      </div>
      <div className="mt-3 min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-text">{playbook.title}</div>
        <div className="mt-0.5 line-clamp-2 text-mini text-text-2">{playbook.subtitle}</div>
        {skipHint && (
          <div className="mt-1 text-[10px] text-text-3">Optional · {skipHint}</div>
        )}
        {blocked && (
          <div className="mt-1 text-[10px] text-warn">Complete prerequisite playbooks first</div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${PHASE_TONE[playbook.phase]}`}
        >
          {PLAYBOOK_PHASE_LABEL[playbook.phase]}
        </span>
        {completed && (
          <span className="rounded-full border border-ok-border bg-ok-soft px-2 py-0.5 text-[10px] font-medium text-ok">
            Completed
          </span>
        )}
        {onStart && total > 0 && done < total && !blocked && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              if (connected) onStart();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                if (connected) onStart();
              }
            }}
            className="rounded-[6px] border border-accent/30 px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent-soft/40"
          >
            {done > 0 ? "Continue" : "Start"}
          </span>
        )}
      </div>
    </motion.button>
  );
}
