import Link from "next/link";
import { Check } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlatformDownloadButton } from "@/components/download/PlatformDownloadButton";
import { pricingFaq, pricingPlans } from "@/lib/pricing";

export const metadata = {
  title: "Pricing — Marketing IDE",
  description:
    "Simple subscription pricing for developers. Free scan & preview. Pro from $20/mo with included AI usage.",
};

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-bg pt-28 pb-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Pricing
            </p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.03em] text-ink md:text-5xl">
              Ship marketing like you ship code
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-ink-2">
              Download free, preview offline, subscribe when you need full AI. Token usage is
              metered transparently — included monthly budget on Pro and Team, Cursor-style.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.highlighted
                    ? "border-accent/40 bg-surface shadow-[0_8px_40px_rgba(8,48,96,0.08)]"
                    : "border-line bg-surface"
                }`}
              >
                {"badge" in plan && plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-serif text-4xl font-medium text-ink">{plan.price}</span>
                    <span className="text-sm text-ink-3">{plan.period}</span>
                  </div>
                  <p className="mt-3 text-sm text-ink-2">{plan.description}</p>
                </div>
                <ul className="mb-8 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-ink-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-accent text-white hover:bg-accent/90"
                      : "border border-line bg-surface-2 text-ink hover:bg-elevated"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-line bg-surface-2 p-8 text-center">
            <h3 className="text-lg font-semibold text-ink">Ready to launch?</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-ink-2">
              Install the desktop app, open your project folder, and subscribe from Settings after
              sign-in. Payments processed securely by Paddle.
            </p>
            <div className="mt-6 flex justify-center">
              <PlatformDownloadButton id="pricing-download-button" />
            </div>
          </div>

          <div className="mt-20">
            <h2 className="text-center font-serif text-2xl font-medium text-ink">
              Pricing questions
            </h2>
            <dl className="mx-auto mt-8 max-w-2xl space-y-6">
              {pricingFaq.map((item) => (
                <div key={item.question}>
                  <dt className="text-sm font-semibold text-ink">{item.question}</dt>
                  <dd className="mt-1.5 text-sm text-ink-2">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="mt-12 text-center text-sm text-ink-3">
            <Link href="/" className="text-accent hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
