import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  ExternalLink,
  FileCode2,
  FolderOpen,
  Globe,
  History,
  House,
  LayoutPanelLeft,
  Library,
  Map as MapIcon,
  MessageSquarePlus,
  Plug,
  Settings as SettingsIcon,
  Wand2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { flattenFilePaths, rankFilePaths } from "@shared/fileSearch";
import type { RecentProject } from "@shared/types";
import { useApp } from "@renderer/state/store";
import { overlayFade, palettePop } from "@renderer/design/animations";
import { Kbd } from "@renderer/components/ui/Kbd";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: LucideIcon;
  enabled?: boolean;
  shortcut?: string[];
  run: () => void;
}

type PaletteRow =
  | { kind: "cmd"; id: string; cmd: Cmd }
  | { kind: "file"; id: string; path: string }
  | { kind: "recent"; id: string; recent: RecentProject }
  | { kind: "hint"; id: string; message: string };

const RECENTS_KEY = "palette.recents";
const RECENTS_MAX = 5;
const fileTreeCache = new Map<string, string[]>();

function loadRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  try {
    const next = [id, ...loadRecents().filter((r) => r !== id)].slice(0, RECENTS_MAX);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette() {
  const open = useApp((s) => s.paletteOpen);
  const toggle = useApp((s) => s.togglePalette);
  const openFolderDialog = useApp((s) => s.openFolderDialog);
  const openProjectPicker = useApp((s) => s.openProjectPicker);
  const openProject = useApp((s) => s.openProject);
  const generatePlan = useApp((s) => s.generatePlan);
  const createNewSession = useApp((s) => s.createNewSession);
  const closeProject = useApp((s) => s.closeProject);
  const setActiveCanvas = useApp((s) => s.setActiveCanvas);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const navigate = useApp((s) => s.navigate);
  const runBrowserTask = useApp((s) => s.runBrowserTask);
  const checkConnection = useApp((s) => s.checkConnection);
  const previewFile = useApp((s) => s.previewFile);
  const project = useApp((s) => s.project);
  const projectRecents = useApp((s) => s.recents);
  const hasProject = project !== null;
  const runtime = useApp((s) => s.runtime);
  const connected = runtime === "connected";
  const projectRoot =
    project?.source.kind === "folder"
      ? project.source.path
      : project?.localPath;
  const fileSearchHint =
    project?.source.kind === "url"
      ? "Live URL projects have no local files — use a folder or repo clone for file search."
      : project?.source.kind === "repo" && !project.localPath
        ? "Re-open this repo to refresh the local clone for file search."
        : null;

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const [filePaths, setFilePaths] = useState<string[]>([]);

  const commands = useMemo<Cmd[]>(
    () => [
      { id: "nav-home", label: "Go to Home", hint: "Navigate", icon: House, run: () => navigate("home") },
      { id: "nav-workspace", label: "Go to Workspace", hint: "Navigate", icon: LayoutPanelLeft, run: () => navigate("workspace") },
      { id: "nav-runs", label: "Go to Runs", hint: "Navigate", icon: History, run: () => navigate("runs") },
      { id: "nav-assets", label: "Go to Assets", hint: "Navigate", icon: Library, run: () => navigate("assets") },
      { id: "nav-help", label: "Go to Help", hint: "Navigate", keywords: "docs shortcuts", icon: House, run: () => navigate("help") },
      { id: "open-project", label: "Open project…", hint: "Project", keywords: "folder repo url clone", icon: FolderOpen, run: () => openProjectPicker() },
      { id: "open-folder", label: "Open project folder", hint: "Project", icon: FolderOpen, run: () => void openFolderDialog() },
      {
        id: "open-cursor",
        label: "Open project in Cursor",
        hint: "Editor",
        keywords: "vscode ide code",
        icon: ExternalLink,
        enabled: !!projectRoot,
        run: () => {
          if (!projectRoot) return;
          void window.api.shell.openInEditor({ editor: "cursor", path: projectRoot, folder: true });
        },
      },
      {
        id: "open-vscode",
        label: "Open project in VS Code",
        hint: "Editor",
        keywords: "vscode ide code",
        icon: ExternalLink,
        enabled: !!projectRoot,
        run: () => {
          if (!projectRoot) return;
          void window.api.shell.openInEditor({ editor: "vscode", path: projectRoot, folder: true });
        },
      },
      { id: "surface-plan", label: "Open Plan Studio", hint: "Surface", keywords: "campaign playbook launch", icon: Wand2, enabled: hasProject, run: () => { setWorkSurface("campaign-plan"); navigate("workspace"); } },
      { id: "surface-funnel", label: "Open Funnel", hint: "Surface", icon: BarChart3, enabled: hasProject, run: () => { setWorkSurface("funnel"); navigate("workspace"); } },
      { id: "surface-research", label: "Open Research Map", hint: "Surface", keywords: "findings competitors", icon: MapIcon, enabled: hasProject, run: () => { setWorkSurface("research-map"); navigate("workspace"); } },
      { id: "surface-content", label: "Open Content Set", hint: "Surface", keywords: "assets copy", icon: Library, enabled: hasProject, run: () => { setWorkSurface("content-set"); navigate("workspace"); } },
      { id: "plan", label: "Generate plan", hint: "Agent", keywords: "launch playbook", icon: Wand2, enabled: hasProject && connected, run: () => { void generatePlan(); navigate("workspace"); } },
      { id: "browser", label: "Browser task", hint: "Agent", keywords: "computer use operator research google", icon: Globe, enabled: connected, run: () => {
        navigate("workspace");
        runBrowserTask(
          "Open Google and search for our top 2 competitors. Open their marketing sites, capture positioning and primary CTAs, and list 3 findings we can act on.",
        );
      } },
      { id: "new-session", label: "New session", icon: MessageSquarePlus, shortcut: ["Ctrl", "N"], run: () => void createNewSession() },
      { id: "close", label: "Close project", icon: XCircle, enabled: hasProject, run: () => closeProject() },
      { id: "connect", label: "Retry connection", hint: "Settings", icon: Plug, run: () => { navigate("settings"); void checkConnection(); } },
      { id: "settings", label: "Settings", icon: SettingsIcon, shortcut: ["Ctrl", ","], run: () => navigate("settings") },
    ],
    [openFolderDialog, openProjectPicker, generatePlan, createNewSession, closeProject, setActiveCanvas, setWorkSurface, navigate, runBrowserTask, checkConnection, hasProject, connected, projectRoot, fileSearchHint],
  );

  useEffect(() => {
    if (!open || !projectRoot) {
      setFilePaths([]);
      return;
    }
    const cached = fileTreeCache.get(projectRoot);
    if (cached) {
      setFilePaths(cached);
      return;
    }
    let cancelled = false;
    void window.api.fs.tree(projectRoot).then((nodes) => {
      if (cancelled) return;
      const paths = flattenFilePaths(nodes);
      fileTreeCache.set(projectRoot, paths);
      setFilePaths(paths);
    });
    return () => {
      cancelled = true;
    };
  }, [open, projectRoot]);

  const rows = useMemo<PaletteRow[]>(() => {
    const available = commands.filter((c) => c.enabled !== false);
    const q = query.trim();
    const out: PaletteRow[] = [];

    if (!q) {
      const byId = new Map(available.map((c) => [c.id, c]));
      for (const id of recents) {
        if (id.startsWith("file:")) {
          const path = id.slice(5);
          if (path) out.push({ kind: "file", id: `file-${path}`, path });
          continue;
        }
        const cmd = byId.get(id);
        if (cmd) out.push({ kind: "cmd", id: cmd.id, cmd });
      }
      for (const r of projectRecents.slice(0, 4)) {
        out.push({ kind: "recent", id: `recent-${r.id}`, recent: r });
      }
      for (const cmd of available) {
        if (!recents.includes(cmd.id)) out.push({ kind: "cmd", id: cmd.id, cmd });
      }
      return out;
    }

    for (const cmd of available) {
      if (fuzzyMatch(q, `${cmd.label} ${cmd.hint ?? ""} ${cmd.keywords ?? ""}`)) {
        out.push({ kind: "cmd", id: cmd.id, cmd });
      }
    }

    if (projectRoot && q.length >= 2) {
      for (const path of rankFilePaths(q, filePaths, 8)) {
        out.push({ kind: "file", id: `file-${path}`, path });
      }
    } else if (fileSearchHint && q.length >= 2 && hasProject) {
      out.push({ kind: "hint", id: "file-search-hint", message: fileSearchHint });
    }

    for (const r of projectRecents) {
      if (fuzzyMatch(q, `${r.name} ${r.source.kind}`)) {
        out.push({ kind: "recent", id: `recent-${r.id}`, recent: r });
      }
    }

    return out;
  }, [commands, query, recents, filePaths, projectRoot, projectRecents, fileSearchHint, hasProject]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setRecents(loadRecents());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const runRow = (row: PaletteRow) => {
    if (row.kind === "hint") return;
    if (row.kind === "cmd") {
      pushRecent(row.cmd.id);
      row.cmd.run();
    } else if (row.kind === "file") {
      pushRecent(`file:${row.path}`);
      void previewFile(row.path);
      navigate("workspace");
    } else {
      pushRecent(row.id);
      void openProject(row.recent.source, { workspace: true });
    }
    toggle(false);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row) runRow(row);
    }
  };

  const activeId = rows[active]?.id;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[14vh]"
          variants={overlayFade}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={() => toggle(false)}
        >
          <div className="absolute inset-0 bg-[var(--overlay)]" />
          <motion.div
            variants={palettePop}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Command palette"
            className="surface relative w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-3)]"
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={activeId ? `palette-${activeId}` : undefined}
              aria-label="Search commands and files"
              placeholder="Commands, files, recent projects…"
              className="w-full border-b border-line bg-transparent px-5 py-4 text-body text-text outline-none placeholder:text-text-3"
            />
            <ul id="palette-list" className="max-h-[320px] overflow-y-auto p-2" role="listbox">
              {rows.length === 0 && (
                <li className="px-3 py-6 text-center text-body-sm text-text-3">No matches</li>
              )}
              {rows.map((row, i) => {
                const isActive = i === active;
                if (row.kind === "hint") {
                  return (
                    <li
                      key={row.id}
                      id={`palette-${row.id}`}
                      className="px-3 py-2 text-caption text-text-3"
                      role="presentation"
                    >
                      {row.message}
                    </li>
                  );
                }
                if (row.kind === "file") {
                  return (
                    <li key={row.id} id={`palette-${row.id}`} role="option" aria-selected={isActive}>
                      <button
                        onClick={() => runRow(row)}
                        onMouseEnter={() => setActive(i)}
                        className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-body-sm transition-colors ${
                          isActive ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface-2"
                        }`}
                      >
                        <FileCode2 size={16} className="shrink-0 text-text-3" />
                        <span className="min-w-0 flex-1 truncate font-mono text-mini">{row.path}</span>
                        <span className="text-micro text-text-3">File</span>
                      </button>
                    </li>
                  );
                }
                if (row.kind === "recent") {
                  return (
                    <li key={row.id} id={`palette-${row.id}`} role="option" aria-selected={isActive}>
                      <button
                        onClick={() => runRow(row)}
                        onMouseEnter={() => setActive(i)}
                        className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-body-sm transition-colors ${
                          isActive ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface-2"
                        }`}
                      >
                        <FolderOpen size={16} className="shrink-0 text-text-3" />
                        <span className="flex-1 truncate">{row.recent.name}</span>
                        <span className="text-micro text-text-3">Recent</span>
                      </button>
                    </li>
                  );
                }
                const cmd = row.cmd;
                const Icon = cmd.icon;
                const isRecent = !query.trim() && recents.includes(cmd.id);
                return (
                  <li key={row.id} id={`palette-${row.id}`} role="option" aria-selected={isActive}>
                    <button
                      onClick={() => runRow(row)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-body-sm transition-colors ${
                        isActive ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface-2"
                      }`}
                    >
                      <Icon size={16} className="text-text-3" />
                      <span className="flex-1">{cmd.label}</span>
                      {isRecent && <Clock size={11} className="text-text-3" aria-label="Recent" />}
                      {cmd.shortcut && (
                        <span className="flex items-center gap-0.5">
                          {cmd.shortcut.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </span>
                      )}
                      {cmd.hint && !cmd.shortcut && <span className="text-micro text-text-3">{cmd.hint}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
