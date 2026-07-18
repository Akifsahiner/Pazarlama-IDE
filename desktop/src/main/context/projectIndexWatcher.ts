/**
 * Debounced project-root watcher — keeps ContextPack fresh after local edits.
 */
import { FileWatcher } from "../fs/watcher";
import { enqueueBackgroundJob } from "../background/jobs";

const active = new Map<string, FileWatcher>();

export function startProjectIndexWatcher(projectId: string, cwd: string): void {
  void stopAllProjectIndexWatchers();
  const watcher = new FileWatcher(
    cwd,
    (paths) => {
      if (!paths.length) return;
      enqueueBackgroundJob({
        type: "index.incremental",
        projectId,
        cwd,
        paths,
      });
    },
    1500,
  );
  watcher.start();
  active.set(projectId, watcher);
}

export async function stopProjectIndexWatcher(projectId: string): Promise<void> {
  const watcher = active.get(projectId);
  if (!watcher) return;
  await watcher.stop();
  active.delete(projectId);
}

export async function stopAllProjectIndexWatchers(): Promise<void> {
  await Promise.all([...active.keys()].map((id) => stopProjectIndexWatcher(id)));
}
