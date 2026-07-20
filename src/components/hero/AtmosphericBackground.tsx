/**
 * Canvas hero — impasto golden landscape + modern glass scrims and orbs.
 * Traditional art meets Cluely-style glass UI (download CTA, pills, mockup frame).
 */
export function AtmosphericBackground() {
  return (
    <div className="canvas-hero" aria-hidden="true">
      <div className="canvas-hero__painting" />
      <div className="canvas-hero__warm-glow" />
      <div className="canvas-hero__scrim-top" />
      <div className="canvas-hero__scrim-readability" />
      <div className="canvas-hero__scrim-bottom" />
      <div className="canvas-hero__glass-orb canvas-hero__glass-orb--a" />
      <div className="canvas-hero__glass-orb canvas-hero__glass-orb--b" />
      <div className="canvas-hero__glass-orb canvas-hero__glass-orb--c" />
      <div className="canvas-hero__noise" />
    </div>
  );
}
