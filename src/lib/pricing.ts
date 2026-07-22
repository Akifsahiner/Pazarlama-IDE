export const pricingPlans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Scan your repo and preview a launch outline — no credit card.",
    cta: "Download",
    ctaHref: "/download",
    highlighted: false,
    features: [
      "Project scan & product reveal",
      "Preview launch outline (offline)",
      "Local-first — files stay on device",
      "No AI plan or agent runs",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$20",
    period: "/ month",
    description: "Full Software CMO — daily ops, agent runs, and browser research.",
    cta: "Download & subscribe",
    ctaHref: "/download",
    highlighted: true,
    badge: "Most popular",
    features: [
      "20 plan generations / month",
      "200 agent turns / month",
      "30 browser minutes / month",
      "~$15 included API usage",
      "Anthropic proxy metering (Sonnet default)",
      "Meta connector & GA4 read-only",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    period: "/ month",
    description: "Collaborate on launch ops with higher limits and client reports.",
    cta: "Download & subscribe",
    ctaHref: "/download",
    highlighted: false,
    features: [
      "60 plan generations / month",
      "600 agent turns / month",
      "90 browser minutes / month",
      "~$40 included API usage",
      "Team collaboration",
      "Client-ready reports export",
    ],
  },
] as const;

export const pricingFaq = [
  {
    question: "How does billing work?",
    answer:
      "Subscribe in the desktop app after sign-in. We use Paddle for secure checkout — same flow as other developer tools. Manage your plan anytime from Settings → Billing.",
  },
  {
    question: "What counts toward usage?",
    answer:
      "Plan generations, agent turns, browser minutes, and estimated API cost (tokens in/out at provider list rates). Pro includes ~$15 of API usage per month; Team includes ~$40.",
  },
  {
    question: "Can I use it offline?",
    answer:
      "Yes. Scan, reveal, and preview outlines work without a subscription. AI plan generation, agent runs, and browser research require Pro or Team.",
  },
  {
    question: "Which AI models are used?",
    answer:
      "Claude Sonnet by default for speed and quality. Deep models are reserved for high-stakes strategic critique. Usage is metered through our cloud proxy — your API keys stay on our server, not in the app.",
  },
] as const;
