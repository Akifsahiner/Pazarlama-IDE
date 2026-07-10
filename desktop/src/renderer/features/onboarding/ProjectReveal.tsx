import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Compass,
  FileCode2,
  FileText,
  Rocket,
  Route as RouteIcon,
  Search,
  Target,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { inferMarketingGaps } from "@shared/marketingGaps";
import {
  QUICK_ACTION_GOALS,
  type QuickActionId,
  isQuickActionDisabled,
  resolveQuickAction,
} from "@shared/quickActions";
import { useApp } from "@renderer/state/store";
import { Card } from "@renderer/components/ui/Card";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { sceneReveal } from "@renderer/design/animations";
import logoUrl from "@renderer/assets/logo.png";
import { buildRevealHandoff } from "@renderer/components/WorkspaceHandoffBanner";

interface Move {
  icon: LucideIcon;
  title: string;
  action: QuickActionId | "generate_plan";
  tone: "accent" | "sales";
}

type RevealBeat = "name" | "stack" | "routes" | "readme" | "gaps" | "moves";

const REVEAL_BEATS: RevealBeat[] = ["name", "stack", "routes", "readme", "gaps", "moves"];

const BEAT_LABEL: Record<RevealBeat, string> = {
  name: "Product",
  stack: "Stack",
  routes: "Routes",
  readme: "Insights",
  gaps: "Gaps",
  moves: "Ready",
};

function RevealProgressRail({ current }: { current: RevealBeat }) {
  const idx = REVEAL_BEATS.indexOf(current);
  return (
    <nav aria-label="Intelligence reveal progress" className="mb-8 flex flex-wrap justify-center gap-1">
      {REVEAL_BEATS.map((beat, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={beat} className="flex items-center">
            {i > 0 && (
              <span className={`mx-1 h-px w-6 ${i <= idx ? "bg-accent/40" : "bg-line"}`} />
            )}
            <span className="flex items-center gap-1 text-[10px]">
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                  done ? "bg-ok text-white" : active ? "border border-accent" : "border border-line"
                }`}
              >
                {done && <Check size={8} strokeWidth={3} />}
              </span>
              <span className={active ? "text-text" : done ? "text-text-2" : "text-text-3"}>
                {BEAT_LABEL[beat]}
              </span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}

/** Product Intelligence Reveal — staged build-up before the workspace. */
export function ProjectReveal() {
  const project = useApp((s) => s.project);
  const persona = useApp((s) => s.settings.persona);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);
  const startRun = useApp((s) => s.startRun);
  const generatePlan = useApp((s) => s.generatePlan);
  const previewPlanOutline = useApp((s) => s.previewPlanOutline);
  const openConnectFlow = useApp((s) => s.openConnectFlow);
  const runQuickAction = useApp((s) => s.runQuickAction);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const runtime = useApp((s) => s.runtime);
  const connected = runtime === "connected";
  const hasFolder = project?.source.kind === "folder";

  const [beat, setBeat] = useState<RevealBeat>("name");

  const enterHome = () => useApp.setState({ phase: "workspace", route: "home" });

  const goWorkspace = (withHandoff = false) => {
    if (withHandoff && project) {
      useApp.getState().setWorkspaceHandoff(
        buildRevealHandoff({
          projectName: project.name,
          connected,
          persona,
        }),
      );
    }
    useApp.setState({ phase: "workspace", route: "workspace" });
    setActiveCanvas("campaign-plan");
    useApp.getState().setWorkSurface("campaign-plan");
  };

  useEffect(() => {
    if (!project) enterHome();
  }, [project]);

  useEffect(() => {
    if (!project || reducedMotion) {
      setBeat("moves");
      return;
    }
    setBeat("name");
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = () => {
      if (i >= REVEAL_BEATS.length - 1) return;
      timers.push(
        setTimeout(() => {
          i += 1;
          setBeat(REVEAL_BEATS[i]!);
          tick();
        }, 520),
      );
    };
    timers.push(setTimeout(tick, 450));
    return () => timers.forEach(clearTimeout);
  }, [project?.id, reducedMotion]);

  const beatIdx = REVEAL_BEATS.indexOf(beat);
  const show = (b: RevealBeat) => beatIdx >= REVEAL_BEATS.indexOf(b);

  const gaps = useMemo(() => (project ? inferMarketingGaps(project) : []), [project]);

  if (!project) return null;

  const runMove = (move: Move) => {
    if (move.action === "generate_plan") {
      if (connected) {
        void generatePlan();
      } else {
        previewPlanOutline();
      }
      setActiveCanvas("campaign-plan");
      goWorkspace(false);
      return;
    }
    if (move.action === "launch") {
      void startRun(QUICK_ACTION_GOALS.LAUNCH);
      setActiveCanvas("run");
      goWorkspace(false);
      return;
    }
    if (move.action === "icp") {
      void startRun(QUICK_ACTION_GOALS.ICP);
      setActiveCanvas("run");
      goWorkspace(false);
      return;
    }
    const action = resolveQuickAction(move.action);
    const blocked = isQuickActionDisabled(action, { connected, hasFolder });
    if (blocked) {
      goWorkspace(false);
      runQuickAction(move.action);
      return;
    }
    if (action.mode === "edit") {
      void startRun(action.draft);
      setActiveCanvas("run");
      goWorkspace(false);
      return;
    }
    runQuickAction(move.action);
    goWorkspace(false);
  };

  const sourceKindLabel =
    project.source.kind === "folder" ? "Local folder" : project.source.kind === "repo" ? "Repository" : "Live site";

  const stats = [
    { icon: FileCode2, label: "Framework", value: project.framework ?? "Detected" },
    { icon: RouteIcon, label: "Routes", value: String(project.routes.length) },
    { icon: BarChart3, label: "Analytics", value: project.hasAnalytics ? "Yes" : "None" },
    {
      icon: FileText,
      label: "Files scanned",
      value: project.scannedFileCount > 0 ? String(project.scannedFileCount) : "—",
    },
  ];

  const moves: Move[] =
    persona === "sales"
      ? [
          { icon: Target, title: "Build my ICP", action: "icp", tone: "sales" },
          { icon: Search, title: "Research 20 leads", action: "leads", tone: "sales" },
          { icon: Rocket, title: "Prepare for launch", action: "launch", tone: "accent" },
        ]
      : [
          { icon: Rocket, title: "Prepare for launch", action: "launch", tone: "accent" },
          { icon: Wand2, title: connected ? "30-day launch plan" : "Preview launch outline", action: "generate_plan", tone: "accent" },
          { icon: Compass, title: "Scan competitors", action: "competitors", tone: "accent" },
        ];

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
      <div className="app-bg" aria-hidden />
      <motion.div
        className="relative w-full max-w-2xl px-8 py-12"
        variants={sceneReveal}
        initial="hidden"
        animate="visible"
      >
        <motion.img
          layoutId="onboarding-logo"
          src={logoUrl}
          alt=""
          aria-hidden
          className="mx-auto mb-6 h-12 w-12 rounded-[var(--radius-lg)] opacity-80 shadow-[var(--shadow-2)]"
        />

        <RevealProgressRail current={beat} />

        <AnimatePresence mode="popLayout">
          {show("name") && (
            <motion.div
              key="name"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 text-ok">
                <CheckCircle2 size={16} />
                <span className="text-label">Product understood</span>
                <Badge className="ml-1">{sourceKindLabel}</Badge>
              </div>
              <h1 className="mt-2 text-display text-text">{project.name}</h1>
              <p className="mt-2 max-w-[60ch] rounded-[var(--radius-md)] border border-accent/25 bg-accent-soft/15 px-3 py-2 text-body-sm text-text-2">
                This is your Cursor project — market it here from the same folder. No re-upload; the agent
                edits files and runs browser research in place.
              </p>
            </motion.div>
          )}

          {show("stack") && (
            <motion.div
              key="stack"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {stats.map((s) => (
                <Card key={s.label} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-text-3">
                    <s.icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-caption">{s.label}</div>
                    <div className="truncate text-body font-medium text-text">{s.value}</div>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}

          {show("routes") && project.routes.length > 0 && (
            <motion.div
              key="routes"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="mb-1.5 text-caption uppercase tracking-wider">Key routes</div>
              <div className="flex flex-wrap gap-1.5">
                {project.routes.slice(0, 8).map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-line bg-surface-2 px-2 py-0.5 font-mono text-micro text-text-2"
                  >
                    {r}
                  </span>
                ))}
                {project.routes.length > 8 && (
                  <span className="rounded-full px-2 py-0.5 text-micro text-text-3">
                    +{project.routes.length - 8} more
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {show("readme") && project.readmeSummary && (
            <motion.div
              key="readme"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="mb-1.5 text-caption uppercase tracking-wider">README insights</div>
              <p className="max-w-[60ch] rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-body text-text-2">
                {project.readmeSummary.slice(0, 220)}
                {project.readmeSummary.length > 220 ? "…" : ""}
              </p>
            </motion.div>
          )}

          {show("gaps") && (
            <motion.div
              key="gaps"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              {gaps.length > 0 ? (
                <>
                  <div className="mb-2 flex items-center gap-1.5 text-caption uppercase tracking-wider text-warn">
                    <AlertTriangle size={12} /> Marketing gaps to close
                  </div>
                  <ul className="space-y-2">
                    {gaps.map((g) => (
                      <li
                        key={g.id}
                        className="rounded-[var(--radius-md)] border border-warn-border/40 bg-warn-soft/20 px-3 py-2"
                      >
                        <div className="text-body-sm font-medium text-text">{g.label}</div>
                        <div className="text-mini text-text-2">{g.hint}</div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="rounded-[var(--radius-md)] border border-ok-border/40 bg-ok-soft/20 px-3 py-2 text-body-sm text-text-2">
                  Scan looks GTM-ready — no critical marketing gaps detected.
                </p>
              )}
            </motion.div>
          )}

          {show("moves") && (
            <motion.div
              key="moves"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-h3 text-text">Suggested first moves</h2>
                <Badge tone={persona === "sales" ? "sales" : "marketing"}>
                  {persona === "sales" ? "Sales" : "Marketing"}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {moves.map((m) => {
                  const actionId = m.action === "generate_plan" ? "plan" : m.action;
                  const disabled =
                    m.action === "generate_plan"
                      ? null
                      : isQuickActionDisabled(resolveQuickAction(actionId), {
                          connected,
                          hasFolder,
                        });
                  return (
                    <Card
                      key={m.title}
                      interactive
                      onClick={() => runMove(m)}
                      className={`flex flex-col gap-2 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                      title={disabled ?? undefined}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${
                          m.tone === "sales" ? "bg-sales-soft text-sales" : "bg-accent-soft text-accent"
                        }`}
                      >
                        <m.icon size={17} />
                      </span>
                      <span className="text-body font-medium text-text">{m.title}</span>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-9 flex flex-col gap-3">
                {!connected && (
                  <p className="text-body-sm text-text-2">
                    Offline is fine — preview a scan-based plan outline first.
                    <button type="button" onClick={openConnectFlow} className="ml-1 text-accent hover:underline">
                      Connect for full AI
                    </button>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    iconRight={<ArrowRight size={16} />}
                    onClick={() => goWorkspace(true)}
                  >
                    {connected ? "Start AI launch plan" : "Preview plan in workspace"}
                  </Button>
                  <Button variant="secondary" onClick={enterHome}>
                    Open dashboard
                  </Button>
                </div>
                <p className="text-mini text-text-3">
                  Recommended: start in Workspace — the bar below shows your exact next step.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
