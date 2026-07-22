import Link from "next/link";

const STEPS = [
  {
    step: "1",
    title: "Install",
    description: "Download for your OS. Local-first — your repo stays on device.",
  },
  {
    step: "2",
    title: "Sign in",
    description: "Create an account in the app. Free tier: scan, reveal, and preview a launch outline.",
  },
  {
    step: "3",
    title: "Subscribe when ready",
    description:
      "Settings → Billing → Pro ($20/mo). Paddle checkout — included API usage metered like Cursor.",
  },
  {
    step: "4",
    title: "Launch",
    description: "Open your folder, generate your plan, run Day 1 tasks. Upgrade limits anytime.",
  },
] as const;

export function DownloadSteps() {
  return (
    <div className="mx-auto mt-14 max-w-2xl text-left">
      <h2 className="text-center font-serif text-2xl font-medium tracking-[-0.02em] text-ink">
        After you download
      </h2>
      <p className="mt-2 text-center text-sm text-ink-2">
        Cluely-style flow: install first, subscribe in-app when you need AI — not before.
      </p>
      <ol className="mt-8 space-y-4">
        {STEPS.map((s) => (
          <li
            key={s.step}
            className="flex gap-4 rounded-2xl border border-line bg-surface p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
              {s.step}
            </span>
            <div>
              <div className="font-medium text-ink">{s.title}</div>
              <p className="mt-0.5 text-sm text-ink-2">{s.description}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-sm text-ink-3">
        Compare plans on{" "}
        <Link href="/pricing" className="text-accent hover:underline">
          Pricing
        </Link>{" "}
        — payment happens inside the desktop app after sign-in.
      </p>
    </div>
  );
}
