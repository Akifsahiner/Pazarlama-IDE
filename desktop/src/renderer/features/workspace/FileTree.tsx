import { useEffect, useState } from "react";
import { ChevronRight, File, Folder } from "lucide-react";
import type { FileTreeNode } from "@shared/types";
import { useApp } from "@renderer/state/store";

function TreeNode({
  node,
  depth,
  onSelect,
  selected,
}: {
  node: FileTreeNode;
  depth: number;
  onSelect: (path: string) => void;
  selected?: string;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.kind === "dir";

  return (
    <li>
      <button
        onClick={() => {
          if (isDir) setOpen((v) => !v);
          else onSelect(node.path);
        }}
        className={`flex w-full items-center gap-1 rounded-[6px] px-1.5 py-1 text-left text-mini transition-colors hover:bg-surface-2 ${
          selected === node.path ? "bg-accent-soft text-text" : "text-text-2"
        }`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {isDir ? (
          <>
            <ChevronRight size={12} className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
            <Folder size={12} className="shrink-0 text-accent" />
          </>
        ) : (
          <>
            <span className="w-3" />
            <File size={12} className="shrink-0" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && open && node.children && (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FileTree() {
  const project = useApp((s) => s.project);
  const previewPath = useApp((s) => s.canvas.previewPath);
  const previewFile = useApp((s) => s.previewFile);
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!project || project.source.kind !== "folder") {
      setTree([]);
      return;
    }
    setLoading(true);
    void window.api.fs
      .tree(project.source.path)
      .then(setTree)
      .finally(() => setLoading(false));
  }, [project]);

  if (!project || project.source.kind !== "folder") {
    return <p className="px-3 py-2 text-mini text-text-3">Open a local folder to browse files.</p>;
  }

  return (
    <div className="px-1 py-2">
      {loading ? (
        <p className="px-3 text-mini text-text-3">Loading tree…</p>
      ) : (
        <ul>
          {tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              onSelect={(path) => void previewFile(path)}
              selected={previewPath}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
