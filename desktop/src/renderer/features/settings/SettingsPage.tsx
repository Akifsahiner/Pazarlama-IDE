import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Gauge,
  Keyboard,
  LogOut,
  Palette,
  Plug,
  Shield,
  Sparkles,
  Store,
  UserRound,
  Users,
  Wifi,
} from "lucide-react";
import { useApp } from "@renderer/state/store";
import { TraceViewerPanel } from "./TraceViewerPanel";
import { SkillQualityPanel } from "./SkillQualityPanel";
import { LaunchReadinessSection } from "./LaunchReadinessSection";
import { ExecutionDebugSection } from "./ExecutionDebugSection";
import { isSelfHostServerUrl } from "@shared/defaults";
import { readDemoConnectorsEnabled, setDemoConnectorsEnabled } from "@shared/demoConnectors";
import type { LLMProviderId, Persona, Settings } from "@shared/types";
import type { ThemePref } from "@renderer/design/theme";
import { Card } from "@renderer/components/ui/Card";
import { Field, Input } from "@renderer/components/ui/Field";
import { Segmented } from "@renderer/components/ui/Segmented";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";
import { Switch } from "@renderer/components/ui/Switch";
import { Dialog } from "@renderer/components/ui/Dialog";
import { UsageQuotaSection } from "./UsageQuotaSection";
import { ConnectorMarketplaceSection } from "./ConnectorMarketplaceSection";
import { TeamSettingsSection } from "./TeamSettingsSection";
import { QualityDashboardSection } from "./QualityDashboardSection";
import { BundledLocalServerCard } from "@renderer/components/BundledLocalServerCard";
import { normalizeTier, tierUpgradeLabel } from "@shared/tierFeatures";
import { ConnectionSetupWizard } from "@renderer/components/ConnectionSetupWizard";

const SECTIONS = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "usage", label: "Usage", icon: Gauge },
  { id: "connection", label: "Connection", icon: Wifi },
  { id: "connectors", label: "Connectors", icon: Store },
  { id: "team", label: "Team", icon: Users },
  { id: "quality", label: "Quality", icon: BarChart3 },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "providers", label: "Providers", icon: Plug },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "about", label: "About", icon: Sparkles },
] as const;

type SettingsSectionId = (typeof SECTIONS)[number]["id"];

function Section({
  id,
  title,
  desc,
  children,
  standalone,
}: {
  id: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
  /** When true, section is the only panel — no divider stack styling. */
  standalone?: boolean;
}) {
  return (
    <section
      id={`settings-${id}`}
      className={standalone ? "space-y-4" : "scroll-mt-4 border-b border-line py-6 first:pt-0 last:border-0"}
    >
      <div className={standalone ? "mb-1" : "mb-3"}>
        <h2 className="text-h3 text-text">{title}</h2>
        {desc && <p className="mt-1 text-body-sm text-text-2">{desc}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** Text setting that saves on debounce and flashes a "Saved" confirmation. */
function DebouncedInput({
  value,
  onSave,
  type = "text",
  placeholder,
}: {
  value: string;
  onSave: (next: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft(value), [value]);

  const scheduleSave = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSave(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    }, 600);
  };

  return (
    <div className="relative">
      <Input type={type} value={draft} placeholder={placeholder} onChange={(e) => scheduleSave(e.target.value)} />
      {saved && (
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-caption text-ok">
          <Check size={11} /> Saved
        </span>
      )}
    </div>
  );
}

/** Shared settings body — route panel, dialog tabs, or full scroll list. */
export function SettingsSections({
  section,
  standalone = false,
}: {
  /** When set, only this section renders (Cursor-style panel). */
  section?: SettingsSectionId;
  standalone?: boolean;
}) {
  const settings = useApp((s) => s.settings);
  const marketingProfile = useApp((s) => s.marketingProfile);
  const version = useApp((s) => s.version);
  const updateSettings = useApp((s) => s.updateSettings);
  const updateMarketingProfile = useApp((s) => s.updateMarketingProfile);
  const connectGa4 = useApp((s) => s.connectGa4);
  const syncGa4Metrics = useApp((s) => s.syncGa4Metrics);
  const auth = useApp((s) => s.auth);
  const tierLabel = useApp((s) => s.tierLabel);
  const signOut = useApp((s) => s.signOut);
  const startCheckout = useApp((s) => s.startCheckout);
  const openBillingPortal = useApp((s) => s.openBillingPortal);
  const connection = useApp((s) => s.connection);
  const [advancedOpen, setAdvancedOpen] = useState(isSelfHostServerUrl(settings.serverUrl));
  const [bundledAvailable, setBundledAvailable] = useState(false);
  const [bundledKeyConfigured, setBundledKeyConfigured] = useState(false);
  const [demoFeed, setDemoFeed] = useState(readDemoConnectorsEnabled());

  const outreachUrl =
    marketingProfile?.outreach_integrations?.webhook_url ?? settings.outreachWebhookUrl ?? "";
  const outreachProvider =
    marketingProfile?.outreach_integrations?.webhook_provider ??
    settings.outreachWebhookProvider ??
    "generic";
  const ga4Connected =
    !!marketingProfile?.ga4_oauth?.refresh_token ||
    !!marketingProfile?.connector_snapshots?.ga4?.metrics?.length;
  const ga4OAuthAvailable = connection.connectors?.ga4OAuth !== false;

  const refreshBundledStatus = async () => {
    const hasKey = await window.api.bundledServer.hasApiKey().catch(() => false);
    setBundledKeyConfigured(hasKey);
  };

  useEffect(() => {
    void window.api.bundledServer.available().then(setBundledAvailable).catch(() => setBundledAvailable(false));
    void refreshBundledStatus();
  }, []);

  const show = (id: SettingsSectionId) => !section || section === id;

  return (
    <>
      {show("account") && (
      <Section id="account" title="Account" standalone={standalone}>
        {!auth.authEnabled ? (
          <Card className="flex items-center gap-2.5 text-body-sm text-text-2">
            <UserRound size={15} className="text-text-3" /> Local dev mode — sign-in is disabled on this backend.
          </Card>
        ) : (
          <div className="space-y-3">
            <Card className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <UserRound size={16} />
                </span>
                <div className="min-w-0">
                  <div className="text-caption text-text-3">Signed in as</div>
                  <div className="truncate text-body text-text">{auth.user?.email ?? auth.email ?? "—"}</div>
                  {auth.user?.tier && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone={auth.user.tier === "free" ? "warn" : "ok"}>
                        {tierLabel ?? auth.user.tier}
                      </Badge>
                      {auth.user.tier === "free" && (
                        <span className="text-micro text-text-3">
                          Scan + preview only · upgrade to {tierUpgradeLabel(normalizeTier(auth.user.tier))} for AI
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" iconLeft={<LogOut size={13} />} onClick={() => void signOut()}>
                Sign out
              </Button>
            </Card>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-body-sm font-medium text-text">Billing</div>
                <p className="text-caption text-text-3">
                  {auth.billingConfigured
                    ? "Manage your subscription via Paddle — upgrade, cancel, or update payment."
                    : "Billing is not configured on this server — ask your admin to add Paddle keys."}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {(auth.user?.tier === "free" || !auth.user?.tier) && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!auth.billingConfigured || auth.state !== "signed-in"}
                    onClick={() => void startCheckout("pro")}
                  >
                    Upgrade to Pro
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!auth.billingConfigured || auth.state !== "signed-in"}
                  onClick={() => void openBillingPortal()}
                >
                  Manage billing
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Section>
      )}

      {show("usage") && (
      <Section
        id="usage"
        title="Usage & quota"
        desc="Monthly limits for plan generation, agent turns, and browser minutes."
        standalone={standalone}
      >
        <UsageQuotaSection />
      </Section>
      )}

      {show("connection") && (
      <Section id="connection" title="Connection" desc="3-step setup for talk-through marketing — files stay on your device." standalone={standalone}>
        <ConnectionSetupWizard showServerField compact />

        <BundledLocalServerCard />

        <Card className="flex items-center justify-between gap-3">
          <div>
            <div className="text-body-sm font-medium text-text">Google Analytics (read-only)</div>
            <p className="text-caption text-text-3">
              {ga4Connected
                ? "Connected — metrics sync from GA4 when configured. Manual KPIs always available."
                : ga4OAuthAvailable
                  ? "OAuth read-only connector. Log waitlist signups and spend manually until connected."
                  : "GA4 OAuth is not configured on this server — log KPIs manually in Plan Studio until your admin adds Google OAuth env vars."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {ga4Connected && (
              <Badge tone="ok">Connected</Badge>
            )}
            {!ga4OAuthAvailable && !ga4Connected && (
              <Badge tone="neutral">Coming soon on this server</Badge>
            )}
            <Button
              variant="secondary"
              size="sm"
              disabled={!ga4OAuthAvailable && !ga4Connected}
              onClick={() => void (ga4Connected ? syncGa4Metrics() : connectGa4())}
            >
              {ga4Connected ? "Sync metrics" : "Connect GA4"}
            </Button>
          </div>
        </Card>

        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-left text-body-sm text-text-2 hover:bg-elevated"
        >
          Advanced — server URL &amp; developer options
          {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {advancedOpen && (
          <>
            {!auth.authEnabled && (
              <Field label="API token" hint="Self-host only; matches server API_TOKEN.">
                <DebouncedInput
                  type="password"
                  value={settings.apiToken}
                  placeholder="Leave empty when using sign-in"
                  onSave={(v) => void updateSettings({ apiToken: v })}
                />
              </Field>
            )}
            {bundledAvailable && (
              <Field
                label="Anthropic API key (local stack only)"
                hint={
                  bundledKeyConfigured
                    ? "Key saved on this device — enter a new value to replace it."
                    : "Required for bundled server AI. Stored in the OS keychain when available."
                }
              >
                <DebouncedInput
                  type="password"
                  value=""
                  placeholder={bundledKeyConfigured ? "•••••••• (configured)" : "sk-ant-…"}
                  onSave={(v) => void window.api.bundledServer.setApiKey(v).then(() => refreshBundledStatus())}
                />
              </Field>
            )}
            <Field
              label="Outreach webhook URL"
              hint="Lemlist, Instantly, or generic POST — you send; we dispatch your pack."
            >
              <DebouncedInput
                type="url"
                value={outreachUrl}
                placeholder="https://api.lemlist.com/api/..."
                onSave={(v) => {
                  void updateSettings({ outreachWebhookUrl: v.trim() });
                  void updateMarketingProfile({
                    outreach_integrations: {
                      webhook_url: v.trim(),
                      webhook_provider: outreachProvider,
                    },
                  });
                }}
              />
            </Field>
            <Field label="Webhook provider">
              <Segmented<NonNullable<Settings["outreachWebhookProvider"]>>
                value={outreachProvider}
                onChange={(v) => {
                  void updateSettings({ outreachWebhookProvider: v });
                  void updateMarketingProfile({
                    outreach_integrations: {
                      webhook_url: outreachUrl.trim(),
                      webhook_provider: v,
                    },
                  });
                }}
                options={[
                  { value: "generic", label: "Generic" },
                  { value: "lemlist", label: "Lemlist" },
                  { value: "instantly", label: "Instantly" },
                ]}
              />
            </Field>
            {import.meta.env.DEV && (
              <label className="flex items-center gap-2 text-body-sm text-text-2">
                <input
                  type="checkbox"
                  checked={demoFeed}
                  onChange={(e) => {
                    setDemoFeed(e.target.checked);
                    setDemoConnectorsEnabled(e.target.checked);
                    if (e.target.checked) useApp.getState().refreshConnectorFeed();
                    else {
                      useApp.getState().clearDemoFeed();
                      useApp.getState().refreshConnectorFeed();
                    }
                  }}
                />
                Show demo connector feed (QA only — never in production)
              </label>
            )}
            <LaunchReadinessSection />
            <ExecutionDebugSection />
            <TraceViewerPanel />
            <SkillQualityPanel />
          </>
        )}
      </Section>
      )}

      {show("connectors") && (
      <Section
        id="connectors"
        title="Connector marketplace"
        desc="Read-only OAuth connectors for GA4, Meta Ads, LinkedIn, and HubSpot."
        standalone={standalone}
      >
        <ConnectorMarketplaceSection />
      </Section>
      )}

      {show("team") && (
      <Section
        id="team"
        title="Team workspace"
        desc="Multi-user approvals and shared project access (Team tier)."
        standalone={standalone}
      >
        <TeamSettingsSection />
      </Section>
      )}

      {show("quality") && (
      <Section
        id="quality"
        title="Quality dashboard"
        desc="Production feedback from thumbs in the agent thread."
        standalone={standalone}
      >
        <QualityDashboardSection />
      </Section>
      )}

      {show("appearance") && (
      <Section id="appearance" title="Appearance" standalone={standalone}>
        <Field label="Theme">
          <Segmented<ThemePref>
            value={settings.theme}
            onChange={(v) => void updateSettings({ theme: v })}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "system", label: "System" },
            ]}
          />
        </Field>
        <Field label="Default focus">
          <Segmented<Persona>
            value={settings.persona}
            onChange={(v) => void updateSettings({ persona: v })}
            options={[
              { value: "marketing", label: "Marketing" },
              { value: "sales", label: "Sales" },
            ]}
          />
        </Field>
        <label className="flex items-center gap-3 text-body text-text">
          <Switch
            checked={settings.reducedMotion}
            onChange={(next) => void updateSettings({ reducedMotion: next })}
            label="Reduced motion"
          />
          {settings.reducedMotion ? "Reduced motion on" : "Animations on"}
        </label>
      </Section>
      )}

      {show("providers") && (
      <Section id="providers" title="Providers" standalone={standalone}>
        <Field label="AI provider">
          <Segmented<LLMProviderId>
            value={settings.provider}
            onChange={(v) => void updateSettings({ provider: v })}
            options={[
              { value: "anthropic", label: "Claude" },
              { value: "openai", label: "OpenAI" },
            ]}
          />
        </Field>
      </Section>
      )}

      {show("privacy") && (
      <Section id="privacy" title="Privacy" standalone={standalone}>
        <label className="flex items-center gap-3 text-body text-text">
          <Switch
            checked={settings.telemetry}
            onChange={(next) => void updateSettings({ telemetry: next })}
            label="Anonymous usage analytics"
          />
          {settings.telemetry
            ? "On — redacted events sent to your configured server"
            : "Off — nothing leaves your machine"}
        </label>
      </Section>
      )}

      {show("about") && (
      <Section id="about" title="About" standalone={standalone}>
        <div className="flex items-center gap-2">
          <Badge>v{version}</Badge>
          <span className="text-body-sm text-text-2">Marketing IDE — Claude for Marketing &amp; Sales</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-body-sm text-text-3">
          <Keyboard size={13} /> Cmd/Ctrl+K command center · L composer · J command dock · B sidebar · , settings · N new session
        </div>
      </Section>
      )}
    </>
  );
}

function SettingsNav({
  active,
  onSelect,
  className,
}: {
  active: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  className?: string;
}) {
  return (
    <nav className={className} aria-label="Settings categories">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left text-body-sm transition-colors ${
              isActive
                ? "bg-elevated text-text ring-1 ring-line-2"
                : "text-text-2 hover:bg-surface-2 hover:text-text"
            }`}
          >
            <Icon size={15} className={isActive ? "text-accent" : "text-text-3"} />
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

/** Full settings route — Cursor-style category rail + single scrolling panel. */
export function SettingsPage() {
  const pendingSection = useApp((s) => s.settingsSection);
  const [active, setActive] = useState<SettingsSectionId>(SECTIONS[0].id);

  useEffect(() => {
    if (pendingSection && SECTIONS.some((s) => s.id === pendingSection)) {
      setActive(pendingSection as SettingsSectionId);
      useApp.setState({ settingsSection: undefined });
    }
  }, [pendingSection]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-line px-8 py-5">
        <div className="text-caption uppercase tracking-wide text-text-3">Preferences</div>
        <h1 className="text-h1 text-text">Settings</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-line bg-surface/40 p-3 md:flex">
          <SettingsNav active={active} onSelect={setActive} className="flex flex-col gap-0.5" />
        </aside>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-6 md:px-8 md:py-8">
            <div className="mb-4 flex gap-1 overflow-x-auto pb-1 md:hidden">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-micro font-medium transition-colors ${
                    active === s.id ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-2"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <SettingsSections section={active} standalone />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings in a dialog — used before the Shell exists (onboarding "Self-host").
 * Same sections as the route; one implementation, two frames.
 */
export function SettingsDialog() {
  const open = useApp((s) => s.settingsOpen);
  const toggleSettings = useApp((s) => s.toggleSettings);
  const pendingSection = useApp((s) => s.settingsSection);
  const [active, setActive] = useState<SettingsSectionId>(SECTIONS[0].id);

  useEffect(() => {
    if (pendingSection && SECTIONS.some((s) => s.id === pendingSection)) {
      setActive(pendingSection as SettingsSectionId);
      useApp.setState({ settingsSection: undefined });
    }
  }, [pendingSection]);

  return (
    <Dialog open={open} onClose={() => toggleSettings(false)} title="Settings" width="max-w-2xl">
      <div className="flex max-h-[72vh] min-h-[420px] flex-col overflow-hidden">
        <div className="shrink-0 border-b border-line px-5 py-3">
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-micro font-medium transition-colors ${
                  active === s.id ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-2 hover:text-text"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <SettingsSections section={active} standalone />
        </div>
      </div>
    </Dialog>
  );
}
