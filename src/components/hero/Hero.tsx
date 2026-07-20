import { AtmosphericBackground } from "./AtmosphericBackground";
import { HeroHeadline } from "./HeroHeadline";
import { HeroCTA } from "./HeroCTA";
import { HeroMockup } from "./HeroMockup";

export function Hero() {
  return (
    <section className="hero relative flex min-h-svh flex-col items-center overflow-x-hidden pb-8 md:pb-12">
      <AtmosphericBackground />

      <div className="hero-fade-bottom pointer-events-none absolute inset-x-0 bottom-0" aria-hidden="true" />

      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-10 px-5 pt-28 pb-20 md:px-8 lg:gap-12 lg:pt-32 lg:pb-28">
        <div className="flex flex-col items-center gap-8">
          <HeroHeadline />
          <HeroCTA />
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}
