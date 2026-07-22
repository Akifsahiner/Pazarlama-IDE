/**
 * Faz 5 — deterministic PH/HN runbook copy blocks (skill template summaries).
 */
import type { HumanCopyBlock } from "./humanExecutionAsset";

type RunbookCopyMap = Record<string, HumanCopyBlock[]>;

export const RUNBOOK_COPY_BLOCKS: RunbookCopyMap = {
  "T-7d": [
    {
      id: "supporter-dm",
      label: "Supporter DM",
      body: "Hey [name] — we launch on Product Hunt [date]. Would you upvote + leave an honest comment in the first hour? I'll send the link at T-0.",
      platform: "ph",
    },
    {
      id: "hunter-dm",
      label: "Hunter outreach",
      body: "Hi [hunter] — launching [product] on [date]. One-liner: [value prop]. Happy to share maker comment draft + gallery assets.",
      platform: "ph",
    },
  ],
  "T-3d": [
    {
      id: "maker-comment",
      label: "Maker comment draft",
      body: "We built [product] because [founder story]. After [timeframe], [metric/outcome]. Would love your feedback — what would make this a daily tool for you?",
      platform: "ph",
    },
    {
      id: "gallery",
      label: "Gallery blurb",
      body: "[Product] — [tagline]. [3 bullets: problem, solution, proof]. Try it: [link]",
      platform: "ph",
    },
  ],
  "T-1d": [
    {
      id: "tagline",
      label: "Tagline check",
      body: "Final tagline: [under 60 chars]. Bullets locked. CTA: [primary action].",
      platform: "ph",
    },
  ],
  "T-0": [
    {
      id: "launch-hour",
      label: "Launch hour script",
      body: "T-0: Gallery live → post maker comment → DM top 10 supporters with link → monitor first 30 min comments.",
      platform: "ph",
    },
  ],
  "H+2h": [
    {
      id: "reply-wave",
      label: "Reply template",
      body: "Thanks [name]! [Specific answer to their question]. [Soft CTA if relevant].",
      platform: "ph",
    },
  ],
  "T+24h": [
    {
      id: "snapshot",
      label: "24h snapshot",
      body: "Log: upvotes, comments, signup count, top traffic source. Note what comment themes drove clicks.",
      platform: "ph",
    },
  ],
  "T-1d-community": [
    {
      id: "hn-prep",
      label: "HN/IH prep",
      body: "Title: [Show HN: Product — one-line value]. First comment ready with founder context + demo link.",
      platform: "hn",
    },
  ],
};
