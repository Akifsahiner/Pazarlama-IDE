export const brand = {
  name: "Marketing IDE",
} as const;

export { DOWNLOAD_OPTIONS, RELEASE_LATEST, downloadUrl } from "./download";

export const heroCopy = {
  eyebrow: "For founders who ship",
  headlineLine1: "Ship your product.",
  headlineLine2Before: "We'll handle the",
  accentWord: "launch.",
  subheadline:
    "Connect once (or preview offline), open your project folder, and get a 30-day launch plan you approve — agent tasks, diffs, and browser research you apply yourself.",
  cta: "Download Marketing IDE",
  secondaryCta: "View pricing",
} as const;

export const trustItems = [
  "Windows, macOS & Linux",
  "Local-first — files stay on device",
  "Preview offline, connect for AI",
] as const;

export const firstRunFunnel = {
  eyebrow: "First launch",
  title: "Your first hour in the app",
  subtitle:
    "Download is step zero — connect, scan, plan, and run your first task within sixty minutes.",
  steps: [
    {
      title: "Connect",
      description:
        "Start the bundled local AI stack or sign in — or skip and preview a scan-based outline offline.",
      icon: "Server",
      accent: "blue" as const,
    },
    {
      title: "Open folder",
      description: "Point at the same repo you built in Cursor. Secrets in .env are never read.",
      icon: "FolderOpen",
      accent: "orange" as const,
    },
    {
      title: "Scan & reveal",
      description: "Routes, stack, gaps — then one click into Plan Studio (no second handoff).",
      icon: "ScanSearch",
      accent: "green" as const,
    },
    {
      title: "Plan & execute",
      description: "Day 1 task by minute 40 — diffs you approve, browser research, KPIs you log.",
      icon: "GitBranch",
      accent: "blue" as const,
    },
  ],
} as const;

export const outcomeStrip = {
  line: "From finished code to launched and selling — without hiring a marketing or sales team.",
  badges: [
    { label: "Edit site as diffs", accent: "blue" as const },
    { label: "Verify in a live browser", accent: "orange" as const },
    { label: "Research & draft outreach — you send", accent: "green" as const },
  ],
} as const;

export const founderQuote = {
  quote:
    "I built my product in a month, then sat on it for half a year because I had no idea how to launch. Marketing IDE turned that fear into a checklist I could actually ship.",
  author: "Every developer who can build but not launch",
} as const;

export const navLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Workspace", href: "/#workspace" },
  { label: "FAQ", href: "/#faq" },
] as const;

export const featureBento = {
  eyebrow: "Capabilities",
  title: "Everything you need to ship marketing",
  subtitle: "Six focused surfaces — not six disconnected tools.",
  items: [
    {
      title: "Campaign Canvas",
      description: "See your entire campaign logic on one surface.",
    },
    {
      title: "Audience Intelligence",
      description: "Persona, pain points, objections, and buying triggers.",
    },
    {
      title: "Competitor Scan",
      description: "Analyze competitor messaging and find positioning gaps.",
    },
    {
      title: "Copy Studio",
      description: "Ad copy, landing sections, emails, and social content.",
    },
    {
      title: "Launch Checklist",
      description: "Track every step from idea to live campaign.",
    },
    {
      title: "Brand Memory",
      description: "Generate on-brand output from past campaigns and tone.",
    },
  ],
} as const;

export const useCases = {
  eyebrow: "Use cases",
  title: "Marketing should feel fluid, not fragmented",
  subtitle: "Four workflows Marketing IDE is built for.",
  scenarios: [
    {
      title: "New product launch",
      description: "Positioning, landing page, and ad angles in one sprint.",
    },
    {
      title: "Founder-led marketing",
      description: "Turn scattered ideas into a clear campaign plan.",
    },
    {
      title: "Agency workflow",
      description: "From client brief to strategy and content, fast.",
    },
    {
      title: "Growth sprint",
      description: "Weekly test plan, hypotheses, and channel priorities.",
    },
  ],
} as const;

export const outputProof = {
  eyebrow: "What you get",
  title: "Real output, not generic advice",
  pipeline: [
    "1 brief",
    "5 campaign angles",
    "1 landing structure",
    "12 ad copies",
    "4 email sequences",
  ],
} as const;

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
      "Local-first GTM IDE — connect for AI or preview offline, then ship from your repo.",
    steps: [
      {
        title: "Connect",
        description:
          "Start the bundled local stack, sign in, or continue with preview-only — your files never leave the device.",
        icon: "Server",
        accent: "blue" as const,
      },
      {
        title: "Open",
        description: "Point it at a local project, a GitHub repo, or a live URL.",
        icon: "FolderOpen",
        accent: "blue" as const,
      },
      {
        title: "Understand",
        description:
          "It builds a product profile, positioning, and launch readiness score.",
        icon: "ScanSearch",
        accent: "orange" as const,
      },
      {
        title: "Plan",
        description: "A 30-day task graph with dependencies and clear metrics.",
        icon: "GitBranch",
        accent: "green" as const,
      },
      {
        title: "Execute",
        description: "Every change arrives as a diff. Preview, approve, apply.",
        icon: "Play",
        accent: "blue" as const,
      },
      {
        title: "Measure",
        description:
          "Log KPIs manually or connect GA4 read-only — optional analytics, not required on day one.",
        icon: "BarChart3",
        accent: "green" as const,
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
        question: "Do I need to connect before I can use it?",
        answer:
          "No. Scan, product reveal, and a preview launch outline work offline. Connect (bundled local stack or hosted sign-in) unlocks full AI plan generation, agent runs, and browser research.",
      },
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
        question: "Which operating systems are supported?",
        answer:
          "Windows 10/11, macOS 12+ (Apple Silicon and Intel), and Linux (AppImage). The download button detects your device; you can also pick another platform on the download page.",
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
      "Download Marketing IDE — connect or preview offline, open your folder, ship your launch plan.",
  },
} as const;
