import { CalendarDays, Target, Users } from "lucide-react";
import type { MarketingPlanSuite } from "@shared/planPlaybooks";

const TYPE_TONE: Record<string, string> = {
  post: "text-accent",
  email: "text-ok",
  article: "text-text-2",
  ad: "text-warn",
};

export function PlanStudioOverview({ plan }: { plan: MarketingPlanSuite }) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface rounded-[var(--radius-lg)] p-5">
          <div className="mb-2 flex items-center gap-2 text-mini font-semibold uppercase tracking-wider text-text-3">
            <Target size={14} className="text-accent" />
            Positioning
          </div>
          <p className="text-[14px] leading-relaxed text-text">{plan.positioning}</p>
        </div>
        <div className="surface rounded-[var(--radius-lg)] p-5">
          <div className="mb-2 flex items-center gap-2 text-mini font-semibold uppercase tracking-wider text-text-3">
            <Users size={14} className="text-accent" />
            Ideal customer
          </div>
          <p className="text-body leading-relaxed text-text-2">{plan.icp}</p>
        </div>
      </div>

      {plan.contentCalendar.length > 0 && (
        <div className="surface rounded-[var(--radius-lg)] p-5">
          <div className="mb-3 flex items-center gap-2 text-mini font-semibold uppercase tracking-wider text-text-3">
            <CalendarDays size={14} className="text-accent" />
            Content calendar
          </div>
          <div className="overflow-hidden rounded-[var(--radius-sm)] border border-line">
            <table className="w-full border-collapse text-left text-body-sm">
              <thead>
                <tr className="bg-surface-2 text-micro uppercase tracking-wider text-text-3">
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {[...plan.contentCalendar]
                  .sort((a, b) => a.day - b.day)
                  .slice(0, 14)
                  .map((c, i) => (
                    <tr key={`${c.day}-${i}`} className="border-t border-line">
                      <td className="px-3 py-2 text-text-3">{c.day}</td>
                      <td className="px-3 py-2 text-text-2">{c.channel}</td>
                      <td className="px-3 py-2 text-text">{c.title}</td>
                      <td className={`px-3 py-2 ${TYPE_TONE[c.type] ?? "text-text-2"}`}>{c.type}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
