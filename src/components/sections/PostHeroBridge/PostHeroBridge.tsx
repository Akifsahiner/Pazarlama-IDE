import { SectionContainer } from "@/components/layout/SectionContainer";
import { OutcomeStrip } from "@/components/ui/OutcomeStrip";

export function PostHeroBridge() {
  return (
    <section className="hero-to-canvas post-hero-bridge relative overflow-hidden">
      <div className="hero-to-canvas__wash" aria-hidden="true" />
      <div className="post-hero-bridge__atmosphere" aria-hidden="true" />
      <div className="post-hero-bridge__line" aria-hidden="true" />
      <div className="canvas-surface-grain" aria-hidden="true" />
      <OutcomeStrip />
    </section>
  );
}
