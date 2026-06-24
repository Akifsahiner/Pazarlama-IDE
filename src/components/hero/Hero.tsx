import { HeroHeadline } from "./HeroHeadline";
import { HeroCTA } from "./HeroCTA";
import { HeroMockup } from "./HeroMockup";

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col items-center overflow-hidden">
      <div className="hero-wallpaper pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="hero-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-48"
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-10 px-5 pt-28 pb-28 md:px-8 lg:gap-14 lg:pt-32 lg:pb-36">
        <div className="flex flex-col items-center gap-8">
          <HeroHeadline />
          <HeroCTA />
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}
