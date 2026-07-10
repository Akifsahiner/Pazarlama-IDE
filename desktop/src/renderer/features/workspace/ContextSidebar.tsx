import { FolderTree } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { FileTree } from "./FileTree";
import { ProjectRail } from "./ProjectRail";

export function ContextSidebar() {
  const sidebarTab = useApp((s) => s.sidebarTab);
  const setSidebarTab = useApp((s) => s.setSidebarTab);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-line bg-surface">
      <div className="flex border-b border-line">
        <button
          onClick={() => setSidebarTab("context")}
          className={`flex-1 px-3 py-2 text-micro font-medium ${
            sidebarTab === "context" ? "border-b-2 border-accent text-text" : "text-text-3"
          }`}
        >
          Workspace
        </button>
        <button
          onClick={() => setSidebarTab("files")}
          className={`flex flex-1 items-center justify-center gap-1 px-3 py-2 text-micro font-medium ${
            sidebarTab === "files" ? "border-b-2 border-accent text-text" : "text-text-3"
          }`}
        >
          <FolderTree size={12} /> Files
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sidebarTab === "files" ? <FileTree /> : <ProjectRail />}
      </div>
    </aside>
  );
}
