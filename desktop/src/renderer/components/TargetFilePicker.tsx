import { useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import type { FileTreeNode } from "@shared/types";
import { isSafeDirectWrite } from "@shared/assetTarget";
import { useApp } from "@renderer/state/store";
import { Button } from "@renderer/components/ui/Button";

function flattenFiles(nodes: FileTreeNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    if (n.kind === "file") acc.push(n.path);
    if (n.children) flattenFiles(n.children, acc);
  }
  return acc;
}

export function TargetFilePicker({
  open,
  onClose,
  onSelect,
  defaultName,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (relPath: string) => void;
  defaultName?: string;
}) {
  const project = useApp((s) => s.project);
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [customPath, setCustomPath] = useState(defaultName ?? "marketing/draft.md");

  const root = project?.source.kind === "folder" ? project.source.path : undefined;

  useEffect(() => {
    if (!open || !root) return;
    setLoading(true);
    void window.api.fs
      .tree(root)
      .then((nodes) => setTree(nodes))
      .finally(() => setLoading(false));
  }, [open, root]);

  const safeFiles = useMemo(
    () => flattenFiles(tree).filter((p) => isSafeDirectWrite(p.replace(/\\/g, "/"))),
    [tree],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-line bg-elevated shadow-[var(--shadow-2)]">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-body-sm font-medium text-text">Choose target file</h2>
          <p className="mt-1 text-micro text-text-2">
            Safe paths: markdown under marketing/ or .md / .txt files.
          </p>
        </div>
        <div className="max-h-48 overflow-y-auto p-2">
          {loading ? (
            <p className="px-2 py-4 text-micro text-text-3">Loading project tree…</p>
          ) : safeFiles.length === 0 ? (
            <p className="px-2 py-4 text-micro text-text-3">No safe files found — enter a new path below.</p>
          ) : (
            safeFiles.slice(0, 80).map((rel) => (
              <button
                key={rel}
                type="button"
                onClick={() => {
                  onSelect(rel.replace(/\\/g, "/"));
                  onClose();
                }}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-mini text-text-2 hover:bg-surface-2"
              >
                <FolderOpen size={12} className="shrink-0 text-text-3" />
                <span className="truncate font-mono">{rel.replace(/\\/g, "/")}</span>
              </button>
            ))
          )}
        </div>
        <div className="space-y-2 border-t border-line p-4">
          <label className="text-micro text-text-2">Or create path</label>
          <input
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 font-mono text-mini text-text outline-none focus:border-[var(--accent-border)]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!customPath.trim() || !isSafeDirectWrite(customPath.trim())}
              onClick={() => {
                onSelect(customPath.trim().replace(/\\/g, "/"));
                onClose();
              }}
            >
              Use path
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
