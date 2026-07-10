export type IDEThemeId = "classic" | "forest" | "autumn" | "spring";

export interface IDETheme {
  id: IDEThemeId;
  label: string;
  wallpaperClass: string;
  railBg: string;
  sidebarBg: string;
  editorBg: string;
  agentBg: string;
  titleBarBg: string;
  statusBg: string;
  blur: string;
  activeItemBg: string;
  activeItemText: string;
}

/**
 * The app now ships a single, refined dark theme. The legacy multi-theme map is
 * collapsed: every id resolves to the same theme so persisted settings remain
 * valid during migration. Surfaces are defined by background + hairline border.
 */
const DARK: IDETheme = {
  id: "classic",
  label: "Dark",
  wallpaperClass: "app-bg",
  railBg: "var(--bg)",
  sidebarBg: "var(--surface)",
  editorBg: "var(--bg)",
  agentBg: "var(--surface)",
  titleBarBg: "var(--surface)",
  statusBg: "var(--surface)",
  blur: "0px",
  activeItemBg: "var(--accent-soft)",
  activeItemText: "var(--text)",
};

export const ideThemes: Record<IDEThemeId, IDETheme> = {
  classic: DARK,
  forest: DARK,
  autumn: DARK,
  spring: DARK,
};

export const defaultIDETheme: IDEThemeId = "classic";

export function panelStyle(bg: string): React.CSSProperties {
  return { background: bg };
}
