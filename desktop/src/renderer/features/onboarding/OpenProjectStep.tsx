import { useState } from "react";
import { Clock, Cloud, FolderOpen, GitBranch, Globe, Loader2, Upload } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { ProjectSource } from "@shared/types";
import { Field, Input } from "@renderer/components/ui/Field";
import { Button } from "@renderer/components/ui/Button";
import { Badge } from "@renderer/components/ui/Badge";

const REPO_RE = /^(https?:\/\/|git@)?[\w.-]+[/:][\w.-]+\/[\w.-]+/i;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+/i;

function sourceLabel(source: ProjectSource): string {
  return source.kind === "folder" ? source.path : source.url;
}

export function OpenProjectStep() {
  const scanning = useApp((s) => s.scanning);
  const scanError = useApp((s) => s.scanError);
  const recents = useApp((s) => s.recents);
  const projects = useApp((s) => s.projects);
  const openFolderDialog = useApp((s) => s.openFolderDialog);
  const openProject = useApp((s) => s.openProject);
  const openServerProject = useApp((s) => s.openServerProject);

  const [repoUrl, setRepoUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const repoValid = REPO_RE.test(repoUrl.trim());
  const liveValid = URL_RE.test(liveUrl.trim());

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] as (File & { path?: string }) | undefined;
    if (file?.path) void openProject({ kind: "folder", path: file.path });
  };

  return (
    <div className="space-y-4">
      {scanError && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-danger-border bg-danger-soft px-3 py-2 text-body-sm text-danger"
        >
          Could not open project: {scanError}. Check the path and try again.
        </div>
      )}
      {projects.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-caption uppercase tracking-wider text-text-3">
            <Cloud size={12} /> Your projects
          </div>
          <ul className="space-y-1">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => void openServerProject(p)}
                  disabled={scanning}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-[var(--accent-border)] hover:bg-elevated disabled:opacity-60"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
                    <Cloud size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-text">{p.name}</span>
                    <span className="block truncate text-caption text-text-3">{p.source_ref}</span>
                  </span>
                  {p.framework && <Badge>{p.framework}</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Method 1 — Folder (drag-drop + picker) */}
      <button
        onClick={() => void openFolderDialog()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        disabled={scanning}
        className={`group flex w-full items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-4 text-left transition-colors disabled:opacity-60 ${
          dragOver ? "border-[var(--accent-border)] bg-accent-soft" : "border-line bg-surface-2 hover:border-[var(--accent-border)] hover:bg-elevated"
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
          {scanning ? <Loader2 size={18} className="animate-spin" /> : dragOver ? <Upload size={18} /> : <FolderOpen size={18} />}
        </span>
        <span className="min-w-0">
          <span className="block text-body font-medium text-text">
            {scanning ? "Scanning project…" : dragOver ? "Drop to open" : "Open a project folder"}
          </span>
          <span className="block text-body-sm text-text-2">
            Same folder you built in Cursor — we scan routes, analytics, and stack to run GTM here.
          </span>
        </span>
      </button>

      {/* Method 2 — Repo */}
      <Field
        label="Connect a repository"
        error={repoUrl.trim() && !repoValid ? "Enter a valid git/GitHub URL." : undefined}
      >
        <div className="flex gap-2">
          <Input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && repoValid && void openProject({ kind: "repo", url: repoUrl.trim() })}
            placeholder="github.com/you/app"
          />
          <Button
            variant="secondary"
            iconLeft={<GitBranch size={14} />}
            disabled={!repoValid || scanning}
            onClick={() => void openProject({ kind: "repo", url: repoUrl.trim() })}
          >
            Clone
          </Button>
        </div>
      </Field>

      {/* Method 3 — Live URL */}
      <Field
        label="Use a live site"
        error={liveUrl.trim() && !liveValid ? "Enter a full URL (https://…)." : undefined}
      >
        <div className="flex gap-2">
          <Input
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && liveValid && void openProject({ kind: "url", url: liveUrl.trim() })}
            placeholder="https://yourapp.com"
          />
          <Button
            variant="secondary"
            iconLeft={<Globe size={14} />}
            disabled={!liveValid || scanning}
            onClick={() => void openProject({ kind: "url", url: liveUrl.trim() })}
          >
            Open
          </Button>
        </div>
      </Field>

      {recents.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex items-center gap-1.5 text-caption uppercase tracking-wider text-text-3">
            <Clock size={12} /> Recent
          </div>
          <ul className="space-y-0.5">
            {recents.slice(0, 5).map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => void openProject(r.source)}
                  disabled={scanning}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  <span className="text-body text-text">{r.name}</span>
                  <span className="ml-auto max-w-[60%] truncate text-caption text-text-3">
                    {sourceLabel(r.source)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
