export const colors = {
  canvas: "#FAFAF8",
  canvasElevated: "#FFFFFF",
  ink: "#18181B",
  inkSecondary: "#52525B",
  inkMuted: "#A1A1AA",
  borderSubtle: "rgba(0, 0, 0, 0.06)",
  borderMedium: "rgba(0, 0, 0, 0.10)",
  accentSunset: "#E8956A",
  accentBlue: "#2563EB",
  accentGreen: "#22A55B",
  ctaBlueStart: "#2563EB",
  ctaBlueEnd: "#1D4ED8",
  ctaGlow: "rgba(37, 99, 235, 0.4)",
  springGreen: "#6BCB77",
  uiBg: "hsla(252, 10%, 10%, 0.8)",
  uiBorder: "rgba(255, 255, 255, 0.25)",
  uiText: "#edeef2",
  uiMuted: "#b2b3ba",
  productDark: "#18181B",
} as const;

export const brand = {
  name: "Marketing IDE",
} as const;

export const heroCopy = {
  eyebrow: "For founders who ship",
  headline: "Ship your product. We'll handle the launch.",
  accentWord: "launch.",
  subheadline:
    "Open your project, get a complete marketing plan, and execute it together with AI.",
  cta: "Download for Windows",
  secondaryCta: "Watch 90-second demo",
} as const;

export const trustItems = [
  "Free product analysis",
  "No credit card",
  "Works with your stack",
] as const;

export const outcomeStrip = {
  line: "From finished code to a real launch — without hiring a marketing team.",
  badges: [
    { label: "30-day plan", accent: "orange" as const },
    { label: "1-click apply", accent: "blue" as const },
    { label: "Weekly experiments", accent: "green" as const },
  ],
} as const;

export const founderQuote = {
  quote:
    "I built my product in a month, then sat on it for half a year because I had no idea how to launch. Marketing IDE turned that fear into a checklist I could actually ship.",
  author: "Every developer who can build but not launch",
} as const;

export const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Workspace", href: "#workspace" },
  { label: "FAQ", href: "#faq" },
] as const;

export const heroAgentCopy = {
  command: "Launch on Product Hunt in two weeks. Budget $1,000.",
  response:
    "I prepared a 14-day launch workflow. Your biggest blocker is weak social proof and missing conversion tracking. Let's fix those before driving traffic.",
} as const;

export const activityLog = [
  "Scanned 847 project files",
  "Compared 8 competitors",
  "Generated 3 positioning alternatives",
  "Created landing page patch",
] as const;

export const projectTree = [
  {
    label: "Product",
    children: ["Product brief", "Positioning", "Audience", "Competitors"],
  },
  {
    label: "Launch",
    children: ["Launch plan", "Product Hunt", "Press kit", "Checklist"],
  },
  {
    label: "Website",
    children: ["Landing page", "Pricing", "SEO", "Analytics"],
  },
  {
    label: "Results",
    children: ["Acquisition", "Conversion", "Experiments"],
  },
] as const;

export const sections = {
  howItWorks: {
    eyebrow: "How it works",
    title: "From codebase to launch-ready",
    subtitle:
      "Marketing IDE reads your project, builds a plan, and ships the work with you.",
    steps: [
      {
        title: "Open",
        description: "Point it at a local project, a GitHub repo, or a live URL.",
        icon: "FolderOpen",
      },
      {
        title: "Understand",
        description:
          "It builds a product profile, positioning, and launch readiness score.",
        icon: "ScanSearch",
      },
      {
        title: "Plan",
        description: "A 30-day task graph with dependencies and clear metrics.",
        icon: "GitBranch",
      },
      {
        title: "Execute",
        description: "Every change arrives as a diff. Preview, approve, apply.",
        icon: "Play",
      },
      {
        title: "Measure",
        description:
          "Track results, run experiments, and get a weekly marketing review.",
        icon: "BarChart3",
      },
    ],
  },
  workspace: {
    eyebrow: "The workspace",
    title: "Your launch workspace, not another chatbot",
    subtitle: "Strategy, tasks, diffs, and results — all in one canvas.",
    snapshot: {
      label: "Product Snapshot",
      productType: "B2B SaaS",
      framework: "Next.js",
      coreAction: "Generate SEO articles",
      audience: "Agencies and founders",
    },
    readiness: [
      { label: "Product clarity", score: 82 },
      { label: "Positioning", score: 64 },
      { label: "Landing page", score: 71 },
      { label: "Conversion tracking", score: 35 },
      { label: "Social proof", score: 28 },
      { label: "Distribution", score: 58 },
    ],
    taskGraph: [
      "Clarify ICP",
      "Rewrite positioning",
      "Update landing",
      "Install events",
      "Launch",
    ],
    strategy:
      "Don't start with paid ads. The landing page can't yet convert cold traffic. Begin with founder-led content, targeted outreach, and Product Hunt prep.",
  },
  execute: {
    eyebrow: "Full control",
    title: "See every change before it goes live",
    subtitle: "Cursor-style diffs for your marketing — approve, edit, or reject.",
    diff: {
      file: "landing/hero.tsx",
      removed: "The smartest way to create content at scale.",
      added: "Turn every interview into structured hiring evidence.",
    },
    preview: {
      url: "yourproduct.com",
      badge: "Viewed live site",
    },
  },
  measure: {
    eyebrow: "After launch",
    title: "Launch is just the beginning",
    subtitle:
      "Marketing IDE keeps reading your analytics and tells you the next best move.",
    channels: [
      { name: "Product Hunt", visits: 1400, signups: 72 },
      { name: "LinkedIn", visits: 210, signups: 38 },
      { name: "Direct", visits: 540, signups: 19 },
    ],
    insight:
      "LinkedIn brought fewer visitors than Product Hunt, but converted 3.4x better. Keep founder content; pause broad community posting.",
    stats: [
      {
        value: "847",
        label: "Files scanned",
        description:
          "Marketing IDE reads your repo and live site to build a real product profile.",
      },
      {
        value: "30",
        label: "Day launch plan",
        description:
          "Every plan is an executable task graph, not a static PDF you forget.",
      },
      {
        value: "1-click",
        label: "Approve and apply",
        description:
          "Review each change as a diff, then ship it to your project in one click.",
      },
    ],
  },
  faq: {
    eyebrow: "Questions",
    title: "Frequently asked questions",
    items: [
      {
        question: "Is Marketing IDE a chatbot?",
        answer:
          "No. The center of the app is a living launch workspace — projects, plans, diffs, and results. Chat is just one way to give commands; the real work happens on the canvas.",
      },
      {
        question: "What happens when I open my project folder?",
        answer:
          "It scans your README, routes, landing page, pricing, and analytics setup to build a structured product profile. Secrets like .env are never read, and you choose which folders to exclude.",
      },
      {
        question: "Does it edit my files without permission?",
        answer:
          "Never. Every change is shown as a diff with a live preview. You approve, edit, or reject before anything is applied, and changes land on a separate Git branch you can roll back.",
      },
      {
        question: "What types of projects does it support?",
        answer:
          "The first version is built for web-based SaaS and developer tools made by solo founders and small teams. Mobile app and game launch playbooks come later.",
      },
      {
        question: "Can I talk to customer support?",
        answer:
          "Yes. Reach out through in-app chat or email and we typically respond within 24 hours.",
      },
    ],
  },
  footerCta: {
    title: "Built it? Now launch it.",
    subtitle:
      "Download Marketing IDE and turn your project into a launch-ready product.",
  },
} as const;
