import Image from "next/image";

/**
 * Canvas hero — high-res impasto painting, sharp render, readability layer only on overlay.
 */
export function AtmosphericBackground() {
  return (
    <div className="canvas-hero" aria-hidden="true">
      <Image
        src="/hero/marketing-ide-hero.png"
        alt=""
        fill
        priority
        quality={92}
        sizes="100vw"
        placeholder="empty"
        className="canvas-hero__painting-img"
      />
      <div className="canvas-hero__readability" />
      <div className="canvas-hero__warm-glow" />
      <div className="canvas-hero__scrim-bottom" />
      <div className="canvas-hero__noise" />
    </div>
  );
}
