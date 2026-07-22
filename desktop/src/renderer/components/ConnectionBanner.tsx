import { presentError } from "@renderer/lib/errorPresenter";
import { summarizeUsage } from "@shared/usageDisplay";
import { normalizeTier } from "@shared/tierFeatures";
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
  const tierLabel = useApp((s) => s.tierLabel);
  const authError = useApp((s) => s.authError);
  const navigate = useApp((s) => s.navigate);
  const signOut = useApp((s) => s.signOut);
  const openConnectFlow = useApp((s) => s.openConnectFlow);
  const startCheckout = useApp((s) => s.startCheckout);
  const workspaceHandoff = useApp((s) => s.workspaceHandoff);
  const outboxCount = useApp((s) => s.outboxCount);

  const usageSummary =
    auth.usage && auth.quota
      ? summarizeUsage({
          usage: auth.usage,
          quota: auth.quota,
          tier: normalizeTier(auth.user?.tier),
          tierLabel: tierLabel ?? undefined,
        })
      : null;

  const usageWarning =
    usageSummary && usageSummary.hasAiAccess && (usageSummary.nearLimit || usageSummary.atLimit);

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

  if (connection === "connected" && runtime === "connected" && usageWarning && usageSummary) {
    return (
      <div className="border-b border-warn/30 bg-warn/10 px-3 py-1.5 text-center text-mini text-warn">
        {usageSummary.atLimit
          ? `Monthly included usage reached (${usageSummary.primaryPct}%).`
          : `${usageSummary.primaryPct}% of included usage used — ${usageSummary.primaryLabel}.`}
        {usageSummary.resetLabel ? ` Resets ${usageSummary.resetLabel}.` : null}
        <BannerAction label="View usage" onClick={() => navigate("settings", "usage")} />
        {auth.billingConfigured && normalizeTier(auth.user?.tier) !== "team" && (
          <BannerAction
            label={normalizeTier(auth.user?.tier) === "free" ? "Upgrade to Pro" : "Upgrade plan"}
            onClick={() =>
              void startCheckout(normalizeTier(auth.user?.tier) === "free" ? "pro" : "team")
            }
          />
        )}
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
