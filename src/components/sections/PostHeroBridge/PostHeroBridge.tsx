import { OutcomeStrip } from "@/components/ui/OutcomeStrip";

export function PostHeroBridge() {
  return (
    <section className="post-hero-bridge relative overflow-hidden">
      <div className="post-hero-bridge__atmosphere" aria-hidden="true" />
      <div className="post-hero-bridge__line" aria-hidden="true" />
      <OutcomeStrip />
    </section>
  );
}
