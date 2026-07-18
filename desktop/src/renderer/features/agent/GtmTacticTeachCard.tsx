import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { playbookTitle, tacticTeachingFor, type TacticTeaching } from "@shared/gtmCatalog";
import { useApp } from "@renderer/state/store";

interface GtmTacticTeachCardProps {
  tacticLabel?: string;
  playbookId?: string;
  /** Pre-resolved teaching; skips lookup when provided. */
  teaching?: TacticTeaching | null;
}

/** Expandable mini-lesson for tactics the user may not know. */
export function GtmTacticTeachCard({ tacticLabel, playbookId, teaching }: GtmTacticTeachCardProps) {
  const [open, setOpen] = useState(true);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const setActivePlaybook = useApp((s) => s.setActivePlaybook);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const navigate = useApp((s) => s.navigate);

  const lesson = teaching ?? tacticTeachingFor(tacticLabel, playbookId);
  if (!lesson) return null;

  const openPlaybook = () => {
    navigate("workspace");
    setWorkSurface("campaign-plan");
    setActivePlaybook(lesson.playbookId);
    focusPlanTask({ playbookId: lesson.playbookId });
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-warn/30 bg-warn/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <BookOpen size={14} className="shrink-0 text-warn" />
        <span className="min-w-0 flex-1 text-body-sm font-medium text-text">
          {lesson.phaseLabel ? (
            <span className="mr-1.5 rounded bg-accent-soft/40 px-1.5 py-0.5 font-mono text-[10px] text-accent">
              {lesson.phaseLabel}
            </span>
          ) : null}
          Tactic: {lesson.headline}
        </span>
        {open ? <ChevronDown size={14} className="text-text-3" /> : <ChevronRight size={14} className="text-text-3" />}
      </button>
      {open && (
        <div className="border-t border-warn/20 px-3 pb-3 pt-2">
          <p className="text-mini leading-relaxed text-text-2">{lesson.why}</p>
          <ol className="mt-2 space-y-1.5">
            {lesson.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-micro text-text-2">
                <span className="font-medium tabular-nums text-accent">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={openPlaybook}
            className="mt-2.5 text-micro text-accent hover:underline"
          >
            Open {playbookTitle(lesson.playbookId)} playbook →
          </button>
        </div>
      )}
    </div>
  );
}
