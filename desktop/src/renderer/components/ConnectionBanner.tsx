import { presentError } from "@renderer/lib/errorPresenter";
import { useApp } from "@renderer/state/store";

function BannerAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 underline underline-offset-2 transition-opacity hover:opacity-80"
    >
      {label}
    </button>
  );
}

/**
 * Surfaces backend offline / session-expired states above the workspace.
 * Kurtarma principle: every banner carries an action, not just a warning.
 */
export function ConnectionBanner() {
  const connection = useApp((s) => s.connection.state);
  const runtime = useApp((s) => s.runtime);
  const localOnlyMode = useApp((s) => s.localOnlyMode);
  const auth = useApp((s) => s.auth);
  const authError = useApp((s) => s.authError);
  const navigate = useApp((s) => s.navigate);
  const signOut = useApp((s) => s.signOut);
  const openConnectFlow = useApp((s) => s.openConnectFlow);
  const workspaceHandoff = useApp((s) => s.workspaceHandoff);
  const outboxCount = useApp((s) => s.outboxCount);

  const usage = auth.usage;
  const quota = auth.quota;
  const quotaHigh =
    usage &&
    quota &&
    (usage.agent / quota.agent_limit >= 0.8 || usage.plan / quota.plan_limit >= 0.8);

  if (authError) {
    return (
      <div className="border-b border-danger/30 bg-danger/10 px-3 py-1.5 text-center text-mini text-danger">
        {authError}
        <BannerAction label="Sign in again" onClick={() => void signOut()} />
      </div>
    );
  }

  if (runtime === "degraded") {
    const msg = presentError("anthropic_not_configured").message;
    return (
      <div className="border-b border-warn/30 bg-warn/10 px-3 py-1.5 text-center text-mini text-warn">
        {msg}
        <BannerAction label="Open connection settings" onClick={openConnectFlow} />
      </div>
    );
  }

  if (runtime === "local" && !localOnlyMode && !workspaceHandoff) {
    return (
      <div className="border-b border-line bg-surface-2 px-3 py-1.5 text-center text-mini text-text-2">
        Local mode — enable AI when ready.
        {outboxCount > 0 && (
          <span className="text-warn">
            {" "}
            {outboxCount} message{outboxCount === 1 ? "" : "s"} queued.
          </span>
        )}
        <BannerAction label="Retry connection" onClick={openConnectFlow} />
      </div>
    );
  }

  // Connection dot + retry live in StatusBar only — no duplicate offline banner here.

  if (connection === "connected" && runtime === "connected" && quotaHigh && usage && quota) {
    return (
      <div className="border-b border-warn/30 bg-warn/10 px-3 py-1.5 text-center text-mini text-warn">
        Usage above 80% this month (agent {usage.agent}/{quota.agent_limit}, plans {usage.plan}/
        {quota.plan_limit}). Prefer Sonnet and run plan tasks one at a time.
        <BannerAction label="View usage" onClick={() => navigate("settings", "usage")} />
      </div>
    );
  }

  if (auth.authEnabled && auth.state === "signed-out") {
    return (
      <div className="border-b border-line bg-surface-2 px-3 py-1.5 text-center text-mini text-text-2">
        Sign in to sync projects and usage across devices.
        <BannerAction label="Sign in" onClick={openConnectFlow} />
      </div>
    );
  }

  return null;
}
