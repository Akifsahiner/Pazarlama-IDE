/**
 * Theme engine. Applies a theme by setting `data-theme` on <html>; supports
 * "system" by following the OS preference. The old IDE theme ids
 * (classic/forest/autumn/spring) are migrated to "dark".
 */

export type ThemePref = "dark" | "light" | "system";

const LEGACY_TO_PREF: Record<string, ThemePref> = {
  classic: "dark",
  forest: "dark",
  autumn: "dark",
  spring: "dark",
  dark: "dark",
  light: "light",
  system: "system",
};

/** Normalize any persisted theme value to a valid ThemePref. */
export function migrateTheme(value: string | undefined): ThemePref {
  return (value && LEGACY_TO_PREF[value]) || "dark";
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  );
}

function resolve(pref: ThemePref): "dark" | "light" {
  if (pref === "system") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

/** Apply a theme preference to the document root. */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolve(pref);
}

let mql: MediaQueryList | null = null;
let mqlHandler: ((e: MediaQueryListEvent) => void) | null = null;

/**
 * Initialize theming for a preference. When "system", also subscribes to OS
 * changes. Returns an unsubscribe function.
 */
export function initTheme(pref: ThemePref): () => void {
  applyTheme(pref);
  // Clean up any prior system listener.
  if (mql && mqlHandler) mql.removeEventListener("change", mqlHandler);
  mql = null;
  mqlHandler = null;

  if (pref === "system" && typeof window !== "undefined" && window.matchMedia) {
    mql = window.matchMedia("(prefers-color-scheme: dark)");
    mqlHandler = () => applyTheme("system");
    mql.addEventListener("change", mqlHandler);
  }
  return () => {
    if (mql && mqlHandler) mql.removeEventListener("change", mqlHandler);
    mql = null;
    mqlHandler = null;
  };
}
