import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { tierHasFeature } from "@shared/tierFeatures";
import { apiTeamApprovals, apiTeamOrg } from "@renderer/lib/api";

interface TeamOrgResponse {
  org: { id: string; name: string; tier: string };
  members: Array<{ user_id: string; role: string }>;
}

interface ApprovalsResponse {
  approvals: Array<{
    id: string;
    goal: string;
    status: string;
    created_at: string;
  }>;
}

export function TeamSettingsSection() {
  const settings = useApp((s) => s.settings);
  const authEnabled = useApp((s) => s.auth.authEnabled);
  const tierFeatures = useApp((s) => s.tierFeatures);
  const userTier = useApp((s) => s.auth.user?.tier);
  const [org, setOrg] = useState<TeamOrgResponse | null>(null);
  const [approvals, setApprovals] = useState<ApprovalsResponse["approvals"]>([]);

  const teamEnabled = tierHasFeature(tierFeatures, "team_collab");

  useEffect(() => {
    if (!teamEnabled) return;
    void apiTeamOrg(settings, authEnabled)
      .then(setOrg)
      .catch(() => setOrg(null));
    void apiTeamApprovals(settings, authEnabled)
      .then((r) => setApprovals(r.approvals))
      .catch(() => setApprovals([]));
  }, [settings, authEnabled, teamEnabled]);

  if (!teamEnabled) {
    return (
      <p className="text-body-sm text-text-2">
        Team mode (multi-user approve + shared projects) requires Team tier. Current plan:{" "}
        <span className="text-text">{userTier ?? "free"}</span>.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="team-settings">
      <div className="flex items-center gap-2 text-label text-text">
        <Users size={16} className="text-accent" />
        {org?.org.name ?? "Team workspace"}
      </div>
      <p className="text-caption text-text-2">
        {org?.members.length ?? 0} member(s) · cross-user approval queue for edit runs.
      </p>
      {approvals.length > 0 ? (
        <ul className="space-y-2">
          {approvals.slice(0, 6).map((a) => (
            <li
              key={a.id}
              className="rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 py-2 text-body-sm text-text-2"
            >
              {a.goal}
              <span className="ml-2 text-micro text-warn">{a.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-micro text-text-3">No pending team approvals.</p>
      )}
    </div>
  );
}
