import { z } from "zod";
import { isBroadMarketingStrategy } from "./marketingStrategyRoute.js";

export const executableActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("edit_run"),
    goal: z.string().min(8),
    targetFiles: z.array(z.string()).max(8).optional(),
    sourceAssetId: z.string().optional(),
    citations: z.array(z.string()).max(8).optional(),
    label: z.string().optional(),
  }),
  z.object({
    kind: z.literal("apply_sidecar"),
    assetId: z.string(),
    targetFile: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    kind: z.literal("integrate_site"),
    assetId: z.string(),
    route: z.string(),
    goal: z.string().min(8),
    label: z.string().optional(),
  }),
  z.object({
    kind: z.literal("browser_run"),
    goal: z.string().min(8),
    label: z.string().optional(),
  }),
  z.object({
    kind: z.literal("continue_plan"),
    taskId: z.string(),
    playbookId: z.string().optional(),
    label: z.string().optional(),
  }),
  z.object({
    kind: z.literal("generate_plan"),
    label: z.string().optional(),
  }),
]);

export type ExecutableAction = z.infer<typeof executableActionSchema>;

export const executableActionsBundleSchema = z.object({
  actions: z.array(executableActionSchema).min(1).max(3),
});

export type ExecutableActionsBundle = z.infer<typeof executableActionsBundleSchema>;

export const EXECUTABLE_ACTIONS_TOOL = {
  name: "propose_executable_actions",
  description:
    "Emit 1–3 concrete next actions the user can run in the IDE (edit files, apply copy, browser research, or plan).",
  input_schema: {
    type: "object",
    required: ["actions"],
    properties: {
      actions: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          required: ["kind"],
          properties: {
            kind: {
              type: "string",
              enum: [
                "edit_run",
                "apply_sidecar",
                "integrate_site",
                "browser_run",
                "continue_plan",
                "generate_plan",
              ],
            },
            goal: { type: "string" },
            targetFiles: { type: "array", items: { type: "string" } },
            sourceAssetId: { type: "string" },
            citations: { type: "array", items: { type: "string" } },
            assetId: { type: "string" },
            targetFile: { type: "string" },
            route: { type: "string" },
            taskId: { type: "string" },
            playbookId: { type: "string" },
            label: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const EDIT_INTENT_RE =
  /\b(edit|fix|change|update|rewrite|improve|hero|cta|copy|landing|page|meta|title|tracking|analytics|implement|snippet|headline|düzelt|düzenle|güncelle|yaz|kopya|sayfa|hero|başlık)\b/i;

const LIVE_SITE_RE =
  /\b(live site|apply to site|siteye uygula|gerçek sayfa|production page|app\/page|page\.tsx)\b/i;

export interface ClassifyExecutionInput {
  message: string;
  localContextPack?: string;
  hasLandingAsset?: boolean;
  integrateRoute?: string;
  assetId?: string;
  planNextTaskId?: string;
  planNextTaskTitle?: string;
  doThisNextExcerpt?: string;
}

export function classifyExecutionNeeds(input: ClassifyExecutionInput): ExecutableAction[] {
  const actions: ExecutableAction[] = [];
  const msg = input.message;
  const hasRepoContext = Boolean(input.localContextPack?.trim());
  const paths = extractPathsFromContextPack(input.localContextPack);

  if (input.planNextTaskId && isBroadMarketingStrategy(msg)) {
    actions.push({
      kind: "continue_plan",
      taskId: input.planNextTaskId,
      label: input.planNextTaskTitle ? `Run: ${input.planNextTaskTitle}` : "Run next plan task",
    });
    return actions.slice(0, 3);
  }

  if (isBroadMarketingStrategy(msg) && !input.planNextTaskId) {
    actions.push({ kind: "generate_plan", label: "Build executable plan" });
    return actions;
  }

  if (hasRepoContext && EDIT_INTENT_RE.test(msg)) {
    const goal =
      input.doThisNextExcerpt?.trim() ||
      `Implement the requested marketing change in the repo: ${msg.trim().slice(0, 200)}`;
    actions.push({
      kind: "edit_run",
      goal,
      targetFiles: paths.slice(0, 5),
      label: "Run in project",
    });
  }

  if (
    input.hasLandingAsset &&
    input.integrateRoute &&
    input.assetId &&
    (LIVE_SITE_RE.test(msg) || EDIT_INTENT_RE.test(msg))
  ) {
    actions.push({
      kind: "integrate_site",
      assetId: input.assetId,
      route: input.integrateRoute,
      goal: `Integrate the drafted landing copy into ${input.integrateRoute}`,
      label: "Apply to site",
    });
  }

  if (input.planNextTaskId && actions.length === 0) {
    actions.push({
      kind: "continue_plan",
      taskId: input.planNextTaskId,
      label: input.planNextTaskTitle ? `Run: ${input.planNextTaskTitle}` : "Run next plan task",
    });
  }

  return actions.slice(0, 3);
}

function extractPathsFromContextPack(pack?: string): string[] {
  if (!pack) return [];
  const paths = new Set<string>();
  const re = /(?:^|\n)(?:FILE|PATH|#)\s*[`']?([^\s`']+\.(?:tsx?|jsx?|mdx?|json|css|html|vue|svelte))/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pack)) !== null) {
    paths.add(m[1]!.replace(/\\/g, "/"));
  }
  const citeRe = /`([a-zA-Z0-9_][\w./-]*\.(?:tsx?|jsx?|mdx?|json|css|html)):\d+/g;
  while ((m = citeRe.exec(pack)) !== null) {
    paths.add(m[1]!.replace(/\\/g, "/"));
  }
  return [...paths];
}

export function bundleToSseEvent(bundle: ExecutableActionsBundle): {
  type: "executable_action";
  primary?: ExecutableAction;
  secondary?: ExecutableAction[];
  actions: ExecutableAction[];
} {
  const [primary, ...secondary] = bundle.actions;
  return {
    type: "executable_action",
    primary,
    secondary: secondary.length ? secondary : undefined,
    actions: bundle.actions,
  };
}
