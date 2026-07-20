/** Pre-generated hero image srcset — built by scripts/generate-hero-images.mjs */
export const HERO_WIDTHS = [4096, 2560, 1920, 1600, 1280, 828, 640] as const;

export function heroSrcSet(format: "avif" | "webp"): string {
  return HERO_WIDTHS.map((w) => `/hero/marketing-ide-hero-${w}.${format} ${w}w`).join(", ");
}

export const HERO_PICTURE_FALLBACK = "/hero/marketing-ide-hero-2560.webp";
