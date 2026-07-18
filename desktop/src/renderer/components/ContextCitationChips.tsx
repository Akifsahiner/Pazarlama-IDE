import { FileCode2 } from "lucide-react";
import { extractCodeCitations } from "@shared/codeCitation";
import { useApp } from "@renderer/state/store";

function projectRoot(project: ReturnType<typeof useApp.getState>["project"]): string | undefined {
  if (!project) return undefined;
  if (project.source.kind === "folder") return project.source.path;
  return project.localPath;
}

export function ContextCitationChips({ text }: { text: string }) {
  const project = useApp((s) => s.project);
  const citations = extractCodeCitations(text);
  if (!citations.length) return null;

  const root = projectRoot(project);
  if (!root) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-text-3">
        Grounded in repo
      </span>
      {citations.map((c) => {
        const label = c.endLine ? `${c.path}:${c.startLine}-${c.endLine}` : `${c.path}:${c.startLine}`;
        return (
          <button
            key={`${c.path}:${c.startLine}`}
            type="button"
            title={`Open in Cursor · ${label}`}
            onClick={() => {
              const abs = `${root.replace(/[\\/]+$/, "")}/${c.path.replace(/\\/g, "/")}`;
              void window.api.shell.openInEditor({
                editor: "cursor",
                path: abs,
                line: c.startLine,
              });
            }}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent/30 bg-accent-soft/20 px-2 py-0.5 text-[10px] font-mono text-accent transition-colors hover:bg-accent-soft/40"
          >
            <FileCode2 size={10} className="shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
