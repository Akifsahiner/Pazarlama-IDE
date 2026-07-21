import { getNowTask } from "@shared/cmoOpsCadence";
import { useApp } from "@renderer/state/store";

export function ProofDetailView() {
  const opsCadence = useApp((s) => s.opsCadence ?? s.marketingProfile?.ops_cadence);
  const task = opsCadence ? getNowTask(opsCadence) : null;
  const doneTasks = opsCadence?.tasks.filter((t) => t.status === "done" && t.proof) ?? [];
  const displayTask = task?.proof ? task : doneTasks[doneTasks.length - 1];

  if (!displayTask?.proof) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center p-6 text-center">
        <p className="max-w-sm text-body-sm text-text-3">
          No proof yet. It appears here when a user task or operator proof is completed.
        </p>
      </div>
    );
  }

  const proof = displayTask.proof;

  return (
    <div className="space-y-4 overflow-y-auto p-4">
      <div>
        <div className="text-mini font-semibold uppercase tracking-wide text-text-3">Task</div>
        <p className="mt-1 text-body-sm font-medium text-text">{displayTask.what}</p>
        <p className="mt-1 text-mini text-text-3">{displayTask.done_when}</p>
      </div>

      {proof.kpi_name && (
        <div className="rounded-[var(--radius-md)] border border-line bg-surface-2/50 p-3">
          <div className="text-mini font-semibold text-text-3">KPI</div>
          <p className="mt-1 text-display text-[20px] font-semibold text-text">
            {proof.kpi_value ?? "—"}
            {proof.kpi_target != null && (
              <span className="text-body-sm font-normal text-text-3"> / {proof.kpi_target}</span>
            )}
          </p>
          <p className="text-mini text-text-3">{proof.kpi_name}</p>
        </div>
      )}

      {proof.urls?.map((url) => (
        <div key={url} className="rounded-[var(--radius-md)] border border-line p-3">
          <div className="text-mini font-semibold text-text-3">URL</div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-body-sm text-accent hover:underline"
          >
            {url}
          </a>
        </div>
      ))}

      {proof.commit_sha && (
        <div className="rounded-[var(--radius-md)] border border-line p-3">
          <div className="text-mini font-semibold text-text-3">Commit</div>
          <p className="mt-1 font-mono text-body-sm text-text">{proof.commit_sha}</p>
        </div>
      )}

      {proof.note && (
        <div className="rounded-[var(--radius-md)] border border-accent/20 bg-accent-soft/10 p-3">
          <div className="text-mini font-semibold text-text-3">Note</div>
          <p className="mt-1 text-body-sm italic text-text-2">{proof.note}</p>
        </div>
      )}

      {proof.completed_at && (
        <p className="text-micro text-text-3">
          Completed · {new Date(proof.completed_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
