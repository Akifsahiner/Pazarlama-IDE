import { HERO_PICTURE_FALLBACK, heroSrcSet } from "@/lib/hero-images";

/**
 * Canvas hero — native picture/srcset for sharp impasto painting (no Next recompression).
 */
export function AtmosphericBackground() {
  return (
    <div className="canvas-hero" aria-hidden="true">
      <picture>
        <source type="image/avif" srcSet={heroSrcSet("avif")} sizes="100vw" />
        <source type="image/webp" srcSet={heroSrcSet("webp")} sizes="100vw" />
        <img
          src={HERO_PICTURE_FALLBACK}
          alt=""
          className="canvas-hero__painting-img"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className="canvas-hero__readability" />
      <div className="canvas-hero__warm-glow" />
      <div className="canvas-hero__scrim-bottom" />
      <div className="canvas-hero__noise" />
    </div>
  );
}
