import { ExternalLink, Globe, Search, Users } from "lucide-react";
import { useMemo } from "react";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { useApp } from "@renderer/state/store";
import { GuidedEmptyState } from "@renderer/components/GuidedEmptyState";
import { runSurfaceUnlockAction } from "@renderer/lib/surfaceUnlockActions";
import { Badge } from "@renderer/components/ui/Badge";
import { Button } from "@renderer/components/ui/Button";
import { QUICK_ACTION_GOALS } from "@shared/quickActions";
import { RESEARCH_THEMES, themeForFinding } from "./surfaceData";
import type { Finding } from "@shared/types";

const SEVERITY_TONE: Record<Finding["severity"], "neutral" | "ok" | "warn" | "danger"> = {
  info: "neutral",
  low: "ok",
  medium: "warn",
  high: "danger",
  critical: "danger",
};

export function ResearchMapCanvas() {
  const profile = useApp((s) => s.marketingProfile);
  const findings = useApp((s) => s.browser.findings);
  const runBrowserTask = useApp((s) => s.runBrowserTask);
  const connected = useApp((s) => s.connection.state === "connected");

  const grouped = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of findings) {
      const theme = themeForFinding(f);
      const list = map.get(theme) ?? [];
      list.push(f);
      map.set(theme, list);
    }
    return map;
  }, [findings]);

  const competitors = profile?.competitors ?? [];
  const empty = competitors.length === 0 && findings.length === 0;

  if (empty) {
    const guide = SURFACE_UNLOCK["research-map"];
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-8">
        <GuidedEmptyState
          icon={Search}
          title={guide.unlockTitle}
          description={guide.unlockReason}
          steps={guide.steps}
          primaryAction={{
            label: guide.primaryLabel,
            onClick: () => runSurfaceUnlockAction(guide.primaryAction),
            icon: Globe,
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[220px_1fr_280px]">
      <aside className="space-y-3">
        <h2 className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-text-3">
          <Users size={13} /> Competitors
        </h2>
        {competitors.length === 0 ? (
          <p className="text-mini text-text-3">Add competitors in your marketing profile or discover via browser.</p>
        ) : (
          <ul className="space-y-2">
            {competitors.map((c) => (
              <li
                key={c.name}
                className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3"
              >
                <div className="font-medium text-body-sm text-text">{c.name}</div>
                {c.note && <p className="mt-1 text-micro text-text-2">{c.note}</p>}
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-micro text-accent hover:underline"
                  >
                    <ExternalLink size={11} /> Visit
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={!connected}
          onClick={() => runBrowserTask(QUICK_ACTION_GOALS.COMPETITORS)}
        >
          New research
        </Button>
      </aside>

      <section className="min-h-0 space-y-4 overflow-y-auto">
        <h2 className="text-micro font-semibold uppercase tracking-wider text-text-3">
          Evidence by theme
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {RESEARCH_THEMES.map((theme) => {
            const items = grouped.get(theme.id) ?? [];
            return (
              <div
                key={theme.id}
                className="rounded-[var(--radius-md)] border border-line bg-surface-2/80 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-mini font-medium text-text">{theme.label}</span>
                  <Badge tone={items.length ? "accent" : "neutral"}>{items.length}</Badge>
                </div>
                {items.length === 0 ? (
                  <p className="mt-2 text-micro text-text-3">No findings in this theme yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {items.slice(0, 4).map((f) => (
                      <li key={f.id} className="rounded-[var(--radius-sm)] border border-line/60 bg-surface px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
                          <span className="truncate text-micro text-text">{f.title}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {(grouped.get("general")?.length ?? 0) > 0 && (
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2/80 p-3 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-mini font-medium text-text">General</span>
                <Badge>{grouped.get("general")!.length}</Badge>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="min-h-0 overflow-y-auto">
        <h2 className="mb-2 text-micro font-semibold uppercase tracking-wider text-text-3">
          Latest evidence
        </h2>
        <ul className="space-y-2">
          {[...findings].reverse().slice(0, 12).map((f) => (
            <li key={f.id} className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
                <span className="text-mini font-medium text-text">{f.title}</span>
              </div>
              <p className="mt-1.5 line-clamp-3 text-micro leading-relaxed text-text-2">
                {f.evidence}
              </p>
              {f.suggestion && (
                <p className="mt-1 text-[10.5px] text-accent">{f.suggestion}</p>
              )}
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-text-3 hover:text-accent"
                >
                  <ExternalLink size={10} /> Source
                </a>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
