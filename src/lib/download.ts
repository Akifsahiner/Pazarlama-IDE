/** GitHub Releases — stable filenames per platform (desktop-release.yml + electron-builder). */
export const RELEASE_LATEST =
  "https://github.com/Akifsahiner/Pazarlama-IDE/releases/latest";

export const RELEASE_DOWNLOAD_BASE = `${RELEASE_LATEST}/download`;

export type DownloadPlatform = "windows" | "macos" | "linux" | "unknown";

export interface DownloadOption {
  platform: DownloadPlatform;
  label: string;
  shortLabel: string;
  href: string;
  fileName: string;
}

export const DOWNLOAD_OPTIONS: DownloadOption[] = [
  {
    platform: "windows",
    label: "Get for Windows",
    shortLabel: "Windows",
    href: `${RELEASE_DOWNLOAD_BASE}/Marketing-IDE-Setup-Windows.exe`,
    fileName: "Marketing-IDE-Setup-Windows.exe",
  },
  {
    platform: "macos",
    label: "Get for macOS",
    shortLabel: "macOS",
    href: `${RELEASE_DOWNLOAD_BASE}/Marketing-IDE-Setup-macOS.dmg`,
    fileName: "Marketing-IDE-Setup-macOS.dmg",
  },
  {
    platform: "linux",
    label: "Get for Linux",
    shortLabel: "Linux",
    href: `${RELEASE_DOWNLOAD_BASE}/Marketing-IDE-Setup-Linux.AppImage`,
    fileName: "Marketing-IDE-Setup-Linux.AppImage",
  },
];

/** @deprecated Use resolveDownloadTarget() — kept for static imports during migration. */
export const downloadUrl = DOWNLOAD_OPTIONS[0].href;

export function detectDownloadPlatform(
  userAgent: string,
  platform: string,
): DownloadPlatform {
  const ua = userAgent;
  const plt = platform;

  if (/Win/i.test(plt) || /Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(plt) || /Macintosh|Mac OS/i.test(ua)) return "macos";
  if (/Linux/i.test(plt) || /Linux|X11/i.test(ua)) return "linux";
  return "unknown";
}

/** Primary CTA always points at a release artifact — never /download. */
export function resolveDownloadTarget(platform: DownloadPlatform): DownloadOption {
  if (platform === "unknown") {
    return DOWNLOAD_OPTIONS[0];
  }
  const match = DOWNLOAD_OPTIONS.find((o) => o.platform === platform);
  if (match) return match;
  return DOWNLOAD_OPTIONS[0];
}

export function otherDownloadOptions(current: DownloadPlatform): DownloadOption[] {
  return DOWNLOAD_OPTIONS.filter((o) => o.platform !== current && o.platform !== "unknown");
}
