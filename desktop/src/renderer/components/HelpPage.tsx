import { useState } from "react";
import {
  BookOpen,
  Keyboard,
  Layers,
  LifeBuoy,
  MessageSquare,
  Globe,
  Rocket,
  Target,
} from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Page } from "@renderer/components/ui/Page";
import { Card } from "@renderer/components/ui/Card";
import { Segmented } from "@renderer/components/ui/Segmented";
import { COMPOSER_HINTS } from "@shared/quickActions";
import { SURFACE_UNLOCK } from "@shared/surfaceUnlock";
import { WORK_SURFACES } from "@shared/workSurfaces";
import { personaValue } from "@shared/personaValue";

const SHORTCUTS: [string, string][] = [
  ["Cmd / Ctrl + K", "Command palette — navigate, file search, recent files, Open in Cursor"],
  ["Cmd / Ctrl + L", "Focus the composer (expands dock if collapsed)"],
  ["Cmd / Ctrl + J", "Toggle command dock (workspace)"],
  ["Cmd / Ctrl + 0", "Composer Auto mode (intent picks Ask / Edit / Browse)"],
  ["Cmd / Ctrl + 1 / 2 / 3", "Switch composer mode (Ask / Edit / Browse)"],
  ["Cmd / Ctrl + B", "Toggle the sidebar"],
  ["Cmd / Ctrl + H", "Session history"],
  ["Cmd / Ctrl + ,", "Open settings"],
  ["Cmd / Ctrl + N", "New session"],
];

const LAUNCH_PLAYBOOK: { day: string; title: string; body: string }[] = [
  {
    day: "Day 0",
    title: "Open & scan",
    body: "Open a local folder (best) or clone a repo. Scan builds your marketing profile — routes, stack, README summary.",
  },
  {
    day: "Day 1–2",
    title: "Ship & execute",
    body: "Ship your first landing diff, then run today's ops task from Execution Record — repo ship or post kit with copy-ready script.",
  },
  {
    day: "Day 3",
    title: "Pulse check-in",
    body: "One required ritual: did your hook or primary KPI move? One metric, one answer — no dashboard essay.",
  },
  {
    day: "Day 4–7",
    title: "Week 1 finish",
    body: "One task per day with proof. Plan reference lives backstage — Execution Record owns the path.",
  },
];

const EXPECTATIONS = {
  should: [
    "Scan your repo locally and ship marketing diffs you approve",
    "Run one daily ops task with owners, deadlines, and done-when criteria",
    "Draft copy, post kits, and outreach — you publish and send",
    "Count a task done after you apply file changes, paste a post URL, or confirm research",
    "Run browser research in the operator sandbox",
    "Answer the Day 3 pulse with one metric — full measurement can wait until then",
    "Export outreach CSV — you send from your email tool",
  ],
  shouldNot: [
    "Bulk email or ad publish without your approval",
    "Treat offline outline preview as a personalized AI plan",
    "Fabricate analytics when GA4 is not connected",
    "Upload your full codebase to the cloud for editing",
    "Recommend upvote farms, vote rings, or generic “post on social” advice",
  ],
} as const;

const SKILL_PACK_VERSIONS: { id: string; version: string }[] = [
  { id: "ph_launch", version: "1.1.0" },
  { id: "waitlist-hype-engine", version: "1.1.0" },
  { id: "launch-planning", version: "1.1.0" },
  { id: "landing-page-conversion", version: "1.1.0" },
  { id: "community-launch", version: "1.0.0" },
  { id: "seo-content-engine", version: "1.0.0" },
  { id: "email-nurture-sequence", version: "1.0.0" },
  { id: "twitter-x-founder-gtm", version: "1.0.0" },
  { id: "newsletter-sponsorship", version: "1.0.0" },
  { id: "press-pr-launch", version: "1.0.0" },
  { id: "devrel-open-source-launch", version: "1.0.0" },
];

const CONSUMER_TROUBLESHOOTING: { title: string; body: string }[] = [
  {
    title: "Can't connect / AI features disabled",
    body: "Settings → Connection → Test. Scan and preview outline work offline.",
  },
  {
    title: "Sign-in loops or expires",
    body: "Sign out from Settings → Account and sign in again with Google or email.",
  },
  {
    title: "Plan generation blocked",
    body: "Connect first. Offline? Use Preview outline — labeled clearly in Plan Studio.",
  },
  {
    title: "GA4 connect fails",
    body: "Self-hosted servers need Google OAuth env vars. Until then, log KPIs manually in Plan Studio → Log launch KPI.",
  },
  {
    title: "Run finished but task not done",
    body: "Repo tasks stay awaiting apply until you review the diff and apply at least one file. Browser tasks need findings or your confirm.",
  },
  {
    title: "Failed plan task",
    body: "Retry from the timeline (↻ on failed node), Plan task card in chat, or the next-action bar.",
  },
  {
    title: "Deep links from chat",
    body: "plan-task:// and surface:// links open Plan Studio in workspace — click any playbook link after plan generation.",
  },
];

const ADVANCED_TROUBLESHOOTING: { title: string; body: string }[] = [
  {
    title: "Self-hosted backend",
    body: "Run the server (cd server && npm run dev). Default URL http://127.0.0.1:8787.",
  },
  {
    title: "ANTHROPIC_API_KEY",
    body: "Self-hosted installs need ANTHROPIC_API_KEY in server/.env. Hosted sign-in handles keys for you.",
  },
  {
    title: "Ports stuck after a crash",
    body: "Run desktop/scripts/dev-clean.ps1, then relaunch.",
  },
  {
    title: "Isolated worktree",
    body: "Edit runs never touch main until Apply. Status bar + run header show worktree state. Discard reverts the worktree.",
  },
];

const COMPOSER_MODES: { icon: typeof MessageSquare; label: string; hint: string }[] = [
  { icon: MessageSquare, label: "Ask", hint: COMPOSER_HINTS.ask },
  { icon: Rocket, label: "Edit project", hint: COMPOSER_HINTS.edit },
  { icon: Globe, label: "Browse web", hint: COMPOSER_HINTS.browse },
];

export function HelpPage() {
  const version = useApp((s) => s.version);
  const persona = useApp((s) => s.settings.persona);
  const pv = personaValue(persona);
  const [tab, setTab] = useState<"consumer" | "advanced">("consumer");
  const troubleshooting = tab === "consumer" ? CONSUMER_TROUBLESHOOTING : ADVANCED_TROUBLESHOOTING;

  return (
    <Page title="Help" eyebrow="Support">
      <Card>
        <div className="flex items-start gap-3">
          <Target size={18} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <h2 className="text-h3 text-text">{pv.eyebrow} mode</h2>
            <p className="mt-1 text-body-sm text-text-2">{pv.promise}</p>
            <p className="mt-1 text-mini text-text-3">{pv.honestyNote}</p>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-h3 text-text">What to expect</h2>
        <p className="mt-1 text-body-sm text-text-2">
          Talk-through marketing today: strategy, drafts, and plan tasks — you apply diffs and publish yourself.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-mini font-semibold uppercase tracking-wider text-ok">You should get</div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-body-sm text-text-2">
              {EXPECTATIONS.should.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-mini font-semibold uppercase tracking-wider text-warn">You should not expect</div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-body-sm text-text-2">
              {EXPECTATIONS.shouldNot.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
          <div className="text-mini font-semibold uppercase tracking-wider text-text-3">Skill packs (exemplar)</div>
          <ul className="mt-2 flex flex-wrap gap-2 text-micro text-text-2">
            {SKILL_PACK_VERSIONS.map((s) => (
              <li key={s.id} className="rounded-full bg-surface px-2 py-0.5">
                {s.id} v{s.version}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-text-3">
            See SKILL_EXCELLENCE.md — no generic advice contract enforced in CI.
          </p>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-accent" />
          <h2 className="text-h3 text-text">How to launch in 30 days</h2>
        </div>
        <ol className="mt-4 space-y-4">
          {LAUNCH_PLAYBOOK.map((step) => (
            <li key={step.day} className="flex gap-3">
              <span className="flex h-8 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-micro font-semibold text-accent">
                {step.day}
              </span>
              <div>
                <div className="text-body font-medium text-text">{step.title}</div>
                <p className="mt-0.5 text-body-sm text-text-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-accent" />
          <h2 className="text-h3 text-text">Work surfaces</h2>
        </div>
        <p className="mt-1 text-body-sm text-text-2">
          Each tab in the workspace answers a different question during launch.
        </p>
        <ul className="mt-4 space-y-3">
          {WORK_SURFACES.map((surface) => {
            const guide = SURFACE_UNLOCK[surface];
            return (
              <li
                key={surface}
                className="rounded-[var(--radius-md)] border border-line/80 bg-surface-2/40 px-3 py-2.5"
              >
                <div className="text-body-sm font-medium text-text">{guide.unlockTitle}</div>
                <p className="mt-0.5 text-mini text-text-2">{guide.unlockReason}</p>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <Keyboard size={16} className="text-accent" />
          <h2 className="text-h3 text-text">Keyboard shortcuts</h2>
        </div>
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {SHORTCUTS.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between py-2">
              <span className="text-body text-text-2">{v}</span>
              <kbd className="rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2 py-0.5 text-mono text-text-3">
                {k}
              </kbd>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <h2 className="text-h3 text-text">Composer modes</h2>
        <ul className="mt-3 space-y-3">
          {COMPOSER_MODES.map((m) => (
            <li key={m.label} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-accent">
                <m.icon size={15} />
              </span>
              <div>
                <div className="text-body font-medium text-text">{m.label}</div>
                <div className="text-body-sm text-text-2">{m.hint}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LifeBuoy size={16} className="text-accent" />
            <h2 className="text-h3 text-text">Troubleshooting</h2>
          </div>
          <Segmented
            value={tab}
            onChange={(v) => setTab(v as "consumer" | "advanced")}
            options={[
              { value: "consumer", label: "Getting started" },
              { value: "advanced", label: "Advanced / dev" },
            ]}
          />
        </div>
        <ul className="space-y-3">
          {troubleshooting.map((t) => (
            <li key={t.title}>
              <div className="text-body font-medium text-text">{t.title}</div>
              <p className="mt-0.5 text-body-sm text-text-2">{t.body}</p>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-4 text-body-sm text-text-3">
        Marketing IDE · v{version} — Claude for Marketing &amp; Sales.
      </p>
    </Page>
  );
}
