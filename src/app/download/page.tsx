import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DownloadPageClient } from "@/components/download/DownloadPageClient";
import { ScrollReveal } from "@/components/layout/ScrollReveal";

export const metadata = {
  title: "Download — Marketing IDE",
  description: "Download Marketing IDE for Windows, macOS, or Linux.",
};

const highlights = [
  { label: "Local-first", detail: "Your repo stays on disk — secrets in .env never read" },
  { label: "Preview offline", detail: "Explore the IDE without connecting to AI" },
  { label: "Ship in repo", detail: "Landing diffs, SEO, tracking — apply with approval" },
  { label: "30-day launch graph", detail: "Daily tasks with owner, metric, and done gate" },
] as const;

const pipeline = ["INSTALL", "OPEN PROJECT", "LAUNCH PLAN", "FIRST SHIP", "MEASURE"] as const;

export default function DownloadPage() {
  return (
    <>
      <Header />
      <div className="download-atelier">
        <div className="download-atelier__paint" aria-hidden="true" />
        <div className="download-atelier__wash" aria-hidden="true" />
        <div className="canvas-surface-grain" aria-hidden="true" />
        <div className="atelier-grid-lines" aria-hidden="true" />
        <div className="atelier-light atelier-light--sky" aria-hidden="true" />
        <div className="atelier-light atelier-light--gold" aria-hidden="true" />

        <main className="relative z-[1] pt-28 pb-24 md:pb-32">
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
            <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
              <div>
                <ScrollReveal>
                  <span className="tonal-badge tonal-badge-blue mb-5 inline-flex font-mono text-[11px] tracking-[0.12em] uppercase">
                    Desktop app
                  </span>
                  <h1 className="font-serif text-4xl font-medium tracking-[-0.03em] text-ink md:text-5xl lg:text-[3.25rem]">
                    Download Marketing IDE
                  </h1>
                  <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-2 md:text-lg">
                    Local-first GTM IDE for developers — connect for AI or preview offline. We detect
                    your device and highlight the right installer.
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={0.08} className="mt-8">
                  <div className="atelier-pipeline download-atelier__pipeline">
                    {pipeline.map((stage, index) => (
                      <span key={stage} className="atelier-pipeline__stage">
                        <span
                          className={`atelier-pipeline__label font-mono ${index === 0 ? "is-active" : ""}`}
                        >
                          {stage}
                        </span>
                        {index < pipeline.length - 1 && (
                          <span className="atelier-pipeline__connector" aria-hidden="true" />
                        )}
                      </span>
                    ))}
                  </div>
                </ScrollReveal>

                <ul className="mt-10 flex flex-col gap-4">
                  {highlights.map((item, index) => (
                    <ScrollReveal key={item.label} delay={0.05 + index * 0.04}>
                      <li className="download-atelier__highlight">
                        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase">
                          {item.label}
                        </span>
                        <p className="mt-1 text-sm leading-relaxed text-ink-2">{item.detail}</p>
                      </li>
                    </ScrollReveal>
                  ))}
                </ul>

                <ScrollReveal delay={0.2} className="mt-10 flex flex-wrap gap-2">
                  <span className="atelier-glass-capsule">✓ 847 files scanned</span>
                  <span className="atelier-glass-capsule">✓ Works offline</span>
                  <span className="atelier-glass-capsule atelier-glass-capsule--live">
                    <span className="atelier-status-dot" aria-hidden="true" />
                    Free to start
                  </span>
                </ScrollReveal>
              </div>

              <ScrollReveal delay={0.1}>
                <div className="download-atelier__panel canvas-glass-panel p-6 md:p-8">
                  <DownloadPageClient />
                </div>
              </ScrollReveal>
            </div>

            <p className="mt-14 text-center text-sm text-ink-3">
              <Link href="/" className="text-blue hover:underline">
                ← Back to home
              </Link>
            </p>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
