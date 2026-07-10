import { FileCode2, ExternalLink } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { EmptyState } from "@renderer/components/EmptyState";
import { CodeHighlight } from "@renderer/components/CodeHighlight";
import { langFromPath } from "@renderer/lib/codeHighlight";

export function FilePreview() {
  const path = useApp((s) => s.canvas.previewPath);
  const content = useApp((s) => s.canvas.previewContent);
  const project = useApp((s) => s.project);
  const projectRoot = project?.source.kind === "folder" ? project.source.path : undefined;
  const absPath =
    projectRoot && path
      ? `${projectRoot.replace(/[\\/]+$/, "")}/${path.replace(/\\/g, "/")}`
      : null;

  if (!path) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={FileCode2} title="No file selected" description="Pick a file from the sidebar or Ctrl+K file search." />
      </div>
    );
  }

  const lines = (content ?? "").split("\n");
  const lang = langFromPath(path);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2 size={14} className="shrink-0 text-text-3" />
          <span className="truncate text-mono text-text-2">{path}</span>
          <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-text-3">{lang}</span>
        </div>
        {absPath && (
          <button
            type="button"
            onClick={() => void window.api.shell.openInEditor({ editor: "cursor", path: absPath })}
            className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-line px-2 py-1 text-micro text-text-2 hover:bg-elevated hover:text-text"
          >
            <ExternalLink size={11} /> Open in Cursor
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-bg">
        {content === undefined ? (
          <div className="p-4 text-body-sm text-text-3">Loading…</div>
        ) : (
          <div className="flex min-h-full">
            <div className="select-none border-r border-line bg-surface-2/50 px-3 py-3 text-right font-mono text-[11px] leading-[1.55] text-text-3">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <div className="min-w-0 flex-1 p-3">
              <CodeHighlight code={content} lang={lang} className="text-[13px] leading-[1.55]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
