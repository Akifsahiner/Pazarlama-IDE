import { ChevronDown, FolderGit2, Plus, XCircle } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { Menu, type MenuItemDef } from "@renderer/components/ui/Menu";

export function ProjectSwitcher() {
  const project = useApp((s) => s.project);
  const projects = useApp((s) => s.projects);
  const recents = useApp((s) => s.recents);
  const openServerProject = useApp((s) => s.openServerProject);
  const openProject = useApp((s) => s.openProject);
  const openProjectPicker = useApp((s) => s.openProjectPicker);
  const closeProject = useApp((s) => s.closeProject);

  if (!project) return null;

  const items: MenuItemDef[] = [
    ...projects.map((p) => ({
      id: `cloud-${p.id}`,
      label: p.name,
      icon: <FolderGit2 size={14} />,
      onSelect: () => void openServerProject(p),
    })),
    ...recents
      .filter((r) => r.name !== project.name)
      .slice(0, 5)
      .map((r) => ({
        id: `recent-${r.id}`,
        label: r.name,
        icon: <FolderGit2 size={14} />,
        onSelect: () => void openProject(r.source),
      })),
    {
      id: "open-picker",
      label: "Open project…",
      icon: <Plus size={14} />,
      onSelect: () => openProjectPicker(),
    },
    {
      id: "close-project",
      label: "Close project",
      icon: <XCircle size={14} />,
      onSelect: () => closeProject(),
    },
  ];

  return (
    <Menu
      className="app-no-drag"
      align="left"
      items={items}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-micro text-text-2 transition-colors hover:bg-elevated hover:text-text"
        >
          {project.name}
          <ChevronDown size={11} />
        </button>
      )}
    />
  );
}
