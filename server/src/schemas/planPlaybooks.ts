import { z } from "zod";

export const playbookPhaseSchema = z.enum([
  "foundation",
  "warmup",
  "launch",
  "post_launch",
  "always_on",
]);

export const playbookIconKeySchema = z.enum([
  "product_hunt",
  "paid_ads",
  "email",
  "content",
  "seo",
  "social",
  "partnerships",
  "analytics",
  "sales_outbound",
  "landing",
]);

export const playbookStubSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  phase: playbookPhaseSchema,
  iconKey: playbookIconKeySchema,
  whyIncluded: z.string().optional(),
  sortOrder: z.number(),
});

const planTaskFields = {
  id: z.string(),
  title: z.string(),
  dependsOn: z.array(z.string()),
  metric: z.string().optional(),
  day: z.number(),
  deliverable: z.string().optional(),
  acceptance_criteria: z.string().optional(),
  action_type: z
    .enum(["edit_files", "browser_research", "draft_copy", "analyze"])
    .optional(),
  playbookId: z.string().optional(),
  phaseLabel: z.string().optional(),
  tactic: z.string().optional(),
  channel: z.string().optional(),
  execution_mode: z
    .enum(["repo", "browser", "asset", "run", "connector_read"])
    .optional(),
  instructions_md: z.string().optional(),
  kpi: z.object({ name: z.string(), target: z.string() }).optional(),
};

export const planPlaybookSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string(),
  phase: playbookPhaseSchema,
  iconKey: playbookIconKeySchema,
  accentToken: z.string().optional(),
  executiveSummary: z.string(),
  primaryMetric: z.object({ name: z.string(), target: z.string() }),
  bets: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  skipIf: z.string().optional(),
  dependsOnPlaybookIds: z.array(z.string()).default([]),
  tasks: z.array(z.object(planTaskFields)),
  sortOrder: z.number(),
});

export const readinessWithRationaleSchema = z.object({
  label: z.string(),
  score: z.number().min(0).max(100),
  rationale: z.string().optional(),
  suggestedPlaybookId: z.string().optional(),
  suggestedTactic: z.string().optional(),
});

export const gtmBottleneckSchema = z.enum([
  "awareness",
  "conversion",
  "distribution",
  "revenue",
  "measurement",
]);

export const marketingPlanSuiteSchema = z.object({
  schemaVersion: z.literal(2).optional(),
  id: z.string(),
  thesis: z.string().optional(),
  narrativeHook: z.string().optional(),
  primaryBottleneck: gtmBottleneckSchema.optional(),
  primaryPlaybookId: z.string().optional(),
  bottleneckWhy: z.string().optional(),
  positioning: z.string(),
  icp: z.string(),
  readiness: z.array(readinessWithRationaleSchema),
  playbooks: z.array(planPlaybookSchema),
  taskGraph: z.array(z.object(planTaskFields)),
  contentCalendar: z.array(
    z.object({
      day: z.number(),
      channel: z.string(),
      title: z.string(),
      type: z.enum(["post", "email", "article", "ad"]),
    }),
  ),
  strategyNote: z.string(),
  antiPatterns: z.array(z.string()).optional(),
});

export type PlanPlaybook = z.infer<typeof planPlaybookSchema>;
export type PlaybookStub = z.infer<typeof playbookStubSchema>;
export type MarketingPlanSuite = z.infer<typeof marketingPlanSuiteSchema>;
export type PlaybookPhase = z.infer<typeof playbookPhaseSchema>;
export type PlaybookIconKey = z.infer<typeof playbookIconKeySchema>;
export type ReadinessScoreWithRationale = z.infer<typeof readinessWithRationaleSchema>;

export const PLAN_OUTLINE_TOOL = {
  name: "plan_outline",
  description: "Emit launch thesis and playbook stubs for a marketing plan suite.",
  input_schema: {
    type: "object",
    required: ["thesis", "narrativeHook", "positioning", "icp", "playbooks"],
    properties: {
      thesis: { type: "string" },
      narrativeHook: { type: "string" },
      primaryBottleneck: {
        type: "string",
        enum: ["awareness", "conversion", "distribution", "revenue", "measurement"],
      },
      primaryPlaybookId: { type: "string" },
      bottleneckWhy: { type: "string" },
      positioning: { type: "string" },
      icp: { type: "string" },
      strategyNote: { type: "string" },
      antiPatterns: { type: "array", items: { type: "string" } },
      playbooks: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "title", "subtitle", "phase", "iconKey", "sortOrder"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            subtitle: { type: "string" },
            phase: { type: "string" },
            iconKey: { type: "string" },
            whyIncluded: { type: "string" },
            sortOrder: { type: "number" },
          },
        },
      },
    },
  },
} as const;

export const PLAN_PLAYBOOK_TOOL = {
  name: "plan_playbook_detail",
  description: "Fill one named playbook with executive summary, bets, risks, and tasks.",
  input_schema: {
    type: "object",
    required: [
      "executiveSummary",
      "primaryMetric",
      "bets",
      "risks",
      "tasks",
    ],
    properties: {
      executiveSummary: { type: "string" },
      primaryMetric: {
        type: "object",
        required: ["name", "target"],
        properties: { name: { type: "string" }, target: { type: "string" } },
      },
      bets: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      skipIf: { type: "string" },
      dependsOnPlaybookIds: { type: "array", items: { type: "string" } },
      tasks: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "title", "dependsOn", "day"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            dependsOn: { type: "array", items: { type: "string" } },
            metric: { type: "string" },
            day: { type: "number" },
            deliverable: { type: "string" },
            acceptance_criteria: { type: "string" },
            action_type: {
              type: "string",
              enum: ["edit_files", "browser_research", "draft_copy", "analyze"],
            },
            phaseLabel: { type: "string" },
            tactic: { type: "string" },
            channel: { type: "string" },
            execution_mode: {
              type: "string",
              enum: ["repo", "browser", "asset", "run", "connector_read"],
            },
            instructions_md: { type: "string" },
            kpi: {
              type: "object",
              properties: { name: { type: "string" }, target: { type: "string" } },
            },
          },
        },
      },
    },
  },
} as const;

export const PLAN_READINESS_TOOL = {
  name: "plan_readiness",
  description: "Score launch readiness dimensions with rationale.",
  input_schema: {
    type: "object",
    required: ["readiness"],
    properties: {
      readiness: {
        type: "array",
        items: {
          type: "object",
          required: ["label", "score"],
          properties: {
            label: { type: "string" },
            score: { type: "number" },
            rationale: { type: "string" },
            suggestedPlaybookId: { type: "string" },
            suggestedTactic: { type: "string", description: "Named tactic to fix this gap" },
          },
        },
      },
    },
  },
} as const;

export const PLAN_REVIEW_TOOL = {
  name: "review_playbook",
  description: "Review a playbook for product specificity and task quality.",
  input_schema: {
    type: "object",
    required: ["approve", "mustFix"],
    properties: {
      approve: { type: "boolean" },
      mustFix: { type: "array", items: { type: "string" } },
      productSpecificity: { type: "number" },
    },
  },
} as const;

/** User-requested plan edits from chat (Faz 11). */
export const PLAN_REVISION_TOOL = {
  name: "plan_revision",
  description:
    "Apply a user-requested change to an existing launch plan — add channels, tasks, or playbooks.",
  input_schema: {
    type: "object",
    required: ["summary", "taskIdsToRemove", "tasksToAdd", "newPlaybooks"],
    properties: {
      summary: { type: "string", description: "One paragraph explaining what changed and why." },
      strategyNoteAppend: {
        type: "string",
        description: "Optional sentence to append to strategy note.",
      },
      taskIdsToRemove: { type: "array", items: { type: "string" } },
      tasksToAdd: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "title", "dependsOn", "day", "playbookId"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            dependsOn: { type: "array", items: { type: "string" } },
            metric: { type: "string" },
            day: { type: "number" },
            deliverable: { type: "string" },
            playbookId: { type: "string" },
            action_type: {
              type: "string",
              enum: ["edit_files", "browser_research", "draft_copy", "analyze"],
            },
            channel: { type: "string" },
            tactic: { type: "string" },
          },
        },
      },
      newPlaybooks: {
        type: "array",
        items: {
          type: "object",
          required: [
            "id",
            "slug",
            "title",
            "subtitle",
            "phase",
            "iconKey",
            "executiveSummary",
            "primaryMetric",
            "tasks",
            "sortOrder",
          ],
          properties: {
            id: { type: "string" },
            slug: { type: "string" },
            title: { type: "string" },
            subtitle: { type: "string" },
            phase: { type: "string" },
            iconKey: { type: "string" },
            executiveSummary: { type: "string" },
            primaryMetric: {
              type: "object",
              required: ["name", "target"],
              properties: { name: { type: "string" }, target: { type: "string" } },
            },
            bets: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            tasks: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "title", "dependsOn", "day"],
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  dependsOn: { type: "array", items: { type: "string" } },
                  day: { type: "number" },
                  deliverable: { type: "string" },
                  channel: { type: "string" },
                  action_type: { type: "string" },
                },
              },
            },
            sortOrder: { type: "number" },
          },
        },
      },
      calendarItems: {
        type: "array",
        items: {
          type: "object",
          required: ["day", "channel", "title", "type"],
          properties: {
            day: { type: "number" },
            channel: { type: "string" },
            title: { type: "string" },
            type: { type: "string", enum: ["post", "email", "article", "ad"] },
          },
        },
      },
    },
  },
} as const;
