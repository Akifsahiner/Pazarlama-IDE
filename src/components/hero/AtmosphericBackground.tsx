import Image from "next/image";

/**
 * Canvas hero — impasto golden landscape + modern glass scrims (no floating orbs).
 * Traditional art meets Cluely-style glass UI (download CTA, pills, mockup frame).
 */
export function AtmosphericBackground() {
  return (
    <div className="canvas-hero" aria-hidden="true">
      <div className="canvas-hero__painting-wrap">
        <Image
          src="/hero/golden-landscape-hero.webp"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          className="canvas-hero__painting-img"
        />
      </div>
      <div className="canvas-hero__warm-glow" />
      <div className="canvas-hero__scrim-top" />
      <div className="canvas-hero__scrim-readability" />
      <div className="canvas-hero__scrim-bottom" />
      <div className="canvas-hero__noise" />
    </div>
  );
}
