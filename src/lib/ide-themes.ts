export type IDEThemeId = "classic" | "forest" | "autumn" | "spring";

export type IDETheme = {
  id: IDEThemeId;
  label: string;
  wallpaperClass: string;
  sidebarBg: string;
  editorBg: string;
  agentBg: string;
  titleBarBg: string;
  blur: string;
  activeItemBg: string;
  activeItemText: string;
};

export const ideThemes: Record<IDEThemeId, IDETheme> = {
  classic: {
    id: "classic",
    label: "Classic",
    wallpaperClass: "ide-wallpaper-classic",
    sidebarBg: "rgba(37, 37, 38, 0.97)",
    editorBg: "rgba(30, 30, 30, 0.95)",
    agentBg: "rgba(37, 37, 38, 0.97)",
    titleBarBg: "rgba(45, 45, 45, 0.98)",
    blur: "0px",
    activeItemBg: "rgba(255, 255, 255, 0.1)",
    activeItemText: "#ffffff",
  },
  forest: {
    id: "forest",
    label: "Forest",
    wallpaperClass: "ide-wallpaper-forest",
    sidebarBg: "rgba(8, 10, 14, 0.78)",
    editorBg: "rgba(16, 18, 24, 0.42)",
    agentBg: "rgba(16, 18, 24, 0.52)",
    titleBarBg: "rgba(8, 10, 14, 0.72)",
    blur: "18px",
    activeItemBg: "rgba(88, 101, 242, 0.55)",
    activeItemText: "#ffffff",
  },
  autumn: {
    id: "autumn",
    label: "Autumn",
    wallpaperClass: "ide-wallpaper-autumn",
    sidebarBg: "rgba(18, 10, 8, 0.78)",
    editorBg: "rgba(28, 16, 12, 0.4)",
    agentBg: "rgba(28, 16, 12, 0.5)",
    titleBarBg: "rgba(18, 10, 8, 0.72)",
    blur: "18px",
    activeItemBg: "rgba(230, 120, 50, 0.45)",
    activeItemText: "#fff8f0",
  },
  spring: {
    id: "spring",
    label: "Spring",
    wallpaperClass: "ide-wallpaper-spring",
    sidebarBg: "rgba(14, 18, 16, 0.76)",
    editorBg: "rgba(20, 28, 24, 0.38)",
    agentBg: "rgba(20, 28, 24, 0.48)",
    titleBarBg: "rgba(14, 18, 16, 0.7)",
    blur: "18px",
    activeItemBg: "rgba(107, 203, 119, 0.4)",
    activeItemText: "#f0fff4",
  },
};

export const defaultIDETheme: IDEThemeId = "forest";
