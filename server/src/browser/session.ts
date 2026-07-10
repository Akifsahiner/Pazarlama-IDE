import { randomUUID } from "node:crypto";

import Anthropic from "@anthropic-ai/sdk";

import { chromium, type Browser, type Page } from "playwright";

import { env, hasAnthropic } from "../env.js";

import { withRetry } from "../llm/retry.js";

import {

  MUTATING_ACTIONS,

  describeAction,

  runAction,

  screenshotBase64,

  verbOf,

  bestEffortBbox,

  parseFinding,

  type ComputerAction,

} from "./actions.js";

import type { Finding, FrameMeta, OperatorPhase, Persona } from "./types.js";

import { installNavigationGuard, isBlockedUrl, isCredentialFieldFocused } from "./policy.js";

import { registerSession, unregisterSession } from "./registry.js";



const BETA = "computer-use-2025-11-24";

// Keep only the most recent screenshots in the model context to cap memory + API payload.

const MAX_IMAGE_HISTORY = 4;



const CHROMIUM_ARGS = ["--disable-dev-shm-usage", "--no-sandbox"];



function viewport() {

  return { width: env.BROWSER_VIEWPORT_WIDTH, height: env.BROWSER_VIEWPORT_HEIGHT };

}



export interface SessionCallbacks {

  onStatus: (message: string) => void;

  onFrame: (meta: FrameMeta) => void;

  onPhase: (phase: OperatorPhase, step: number, stepMax: number) => void;

  onNavigated: (url: string, title: string) => void;

  onFinding: (finding: Finding) => void;

  onApprovalRequest: (id: string, summary: string) => void;

  onPaused: () => void;

  onResumed: () => void;

  onDone: () => void;

  onError: (message: string) => void;

}



const SYSTEM_BASE = [

  "You are Marketing IDE's browser operator, driving a Chromium browser for a founder.",

  "Prefer the cheapest reliable method: if a real API or structured data is available, say so",

  "and avoid clicking through the UI. Use the browser only when visual/GUI interaction is the",

  "right tool. Always take a screenshot first to see the current state before acting.",

  "Work in small, verifiable steps. Be concise in your text.",

  "When you observe a concrete conversion, UX, or messaging problem on a page, emit it on its",

  "own line in EXACTLY this format (one finding per line):",

  "FINDING: <severity> | <title> | <evidence> | <suggestion>",

  "where <severity> is one of info, low, medium, high, critical; <title> is a short problem name;",

  "<evidence> is what you actually saw; <suggestion> is one concrete fix. Do not invent findings;",

  "only report what is visible in the current view.",

  "Never enter credentials or payment details, and never read them aloud. Never make purchases,",

  "sign in, or post/submit content without an approval gate. If a task would require any of these,",

  "stop and explain so the user can take over. Respect the site blocklist.",

].join(" ");

const PERSONA_PROMPT: Record<Persona, string> = {

  marketing:

    "Persona: marketing operator. Audit landing pages for conversion, capture competitor positioning, and prioritize clarity of the value proposition, the primary CTA, and trust signals.",

  sales:

    "Persona: prospecting operator. Identify ICP-matching companies and contacts, verify each from a source URL, and never auto-send any outreach — drafting only.",

};

function systemFor(persona: Persona): string {

  return `${SYSTEM_BASE} ${PERSONA_PROMPT[persona]}`;

}

const SEVERITIES = new Set(["info", "low", "medium", "high", "critical"]);

function normalizeSeverity(s: string): Finding["severity"] {

  return (SEVERITIES.has(s) ? s : "info") as Finding["severity"];

}



function isModelNotFound(err: unknown): boolean {

  if (err instanceof Anthropic.APIError) {

    return err.status === 404 || /model/i.test(err.message);

  }

  return false;

}



export class ComputerUseSession {

  private client: Anthropic;

  private browser: Browser | null = null;

  private page: Page | null = null;

  private cancelled = false;

  private autoApprove: boolean;

  private pending = new Map<string, { resolve: (ok: boolean) => void; timer: NodeJS.Timeout }>();

  private cb: SessionCallbacks;

  private task: string;

  private persona: Persona;

  private paused = false;

  private steerQueue: string[] = [];

  private prevUrl = "";

  private lastBbox?: FrameMeta["bbox"];

  private lastTs = "";



  constructor(task: string, autoApprove: boolean, cb: SessionCallbacks, persona: Persona = "marketing") {

    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    this.task = task;

    this.autoApprove = autoApprove;

    this.cb = cb;

    this.persona = persona;

  }



  setAutoApprove(value: boolean): void {

    this.autoApprove = value;

  }



  /** Pause the loop after the current turn (Take over / Pause). */

  pause(): void {

    if (this.paused) return;

    this.paused = true;

    this.cb.onPaused();

  }



  /** Resume a paused loop. */

  resume(): void {

    if (!this.paused) return;

    this.paused = false;

    this.cb.onResumed();

  }



  /** Inject a user instruction to be added before the next model turn. */

  steer(text: string): void {

    const t = text.trim();

    if (t) this.steerQueue.push(t);

  }



  resolveApproval(id: string, ok: boolean): void {

    const entry = this.pending.get(id);

    if (entry) {

      clearTimeout(entry.timer);

      this.pending.delete(id);

      entry.resolve(ok);

    }

  }



  private requestApproval(summary: string): Promise<boolean> {

    if (this.autoApprove) return Promise.resolve(true);

    const id = randomUUID();

    this.cb.onApprovalRequest(id, summary);

    return new Promise((resolve) => {

      // Auto-reject if the user never responds, so the loop can't hang forever.

      const timer = setTimeout(() => {

        this.pending.delete(id);

        this.cb.onStatus("Approval timed out — action rejected.");

        resolve(false);

      }, env.BROWSER_APPROVAL_TIMEOUT_MS);

      timer.unref?.();

      this.pending.set(id, { resolve, timer });

    });

  }



  async stop(): Promise<void> {

    this.cancelled = true;

    for (const [, entry] of this.pending) {

      clearTimeout(entry.timer);

      entry.resolve(false);

    }

    this.pending.clear();

    await this.browser?.close().catch(() => undefined);

    this.browser = null;

    this.page = null;

    unregisterSession(this);

  }



  async start(): Promise<void> {

    if (!hasAnthropic) {

      this.cb.onError("ANTHROPIC_API_KEY is not configured on the server.");

      return;

    }



    registerSession(this);

    try {

      this.cb.onStatus("Launching browser…");

      this.browser = await chromium.launch({

        headless: true,

        args: CHROMIUM_ARGS,

        timeout: 30_000,

      });

      const vp = viewport();

      const context = await this.browser.newContext({ viewport: vp });

      this.page = await context.newPage();

      installNavigationGuard(this.page, (url) =>

        this.cb.onStatus(`Blocked navigation to a restricted site: ${url}`),

      );

      await this.page.goto("https://www.google.com", { waitUntil: "domcontentloaded", timeout: 30_000 });

      this.prevUrl = this.page.url();

      this.lastTs = new Date().toISOString();

      this.cb.onFrame({

        pngBase64: await screenshotBase64(this.page),

        action: "navigate to google.com",

        actionVerb: "navigate",

        url: this.page.url(),

        title: await this.page.title().catch(() => ""),

        step: 0,

        stepMax: env.BROWSER_MAX_STEPS,

        phase: "verifying",

        timestamp: this.lastTs,

      });



      await this.loop();

      if (!this.cancelled) this.cb.onDone();

    } catch (err) {

      if (!this.cancelled) {

        const msg = err instanceof Error ? err.message : String(err);

        if (/Executable doesn't exist|playwright install/i.test(msg)) {

          this.cb.onError("Chromium is not installed. Run: npm run browser:install");

        } else {

          this.cb.onError(msg);

        }

      }

    } finally {

      await this.browser?.close().catch(() => undefined);

      this.browser = null;

      this.page = null;

      unregisterSession(this);

    }

  }



  /** Drop old base64 images from prior tool_results to bound memory/payload. */

  private pruneImages(messages: Anthropic.Beta.BetaMessageParam[]): void {

    let kept = 0;

    for (let i = messages.length - 1; i >= 0; i--) {

      const m = messages[i];

      if (!Array.isArray(m.content)) continue;

      for (const block of m.content) {

        const b = block as { type?: string; content?: unknown };

        if (b.type === "tool_result" && Array.isArray(b.content)) {

          for (const part of b.content as { type?: string; text?: string }[]) {

            if (part.type === "image") {

              if (kept >= MAX_IMAGE_HISTORY) {

                (part as { type: string; text?: string }).type = "text";

                (part as { type: string; text: string }).text = "[screenshot omitted]";

                delete (part as { source?: unknown }).source;

              } else {

                kept++;

              }

            }

          }

        }

      }

    }

  }



  private async createBrowserMessage(

    model: string,

    messages: Anthropic.Beta.BetaMessageParam[],

  ): Promise<Anthropic.Beta.BetaMessage> {

    const vp = viewport();

    return withRetry(

      () =>

        this.client.beta.messages.create({

          model,

          max_tokens: 4096,

          betas: [BETA],

          system: systemFor(this.persona),

          tools: [

            {

              type: "computer_20251124",

              name: "computer",

              display_width_px: vp.width,

              display_height_px: vp.height,

            },

          ],

          messages,

        }),

      { retries: 2, baseMs: 800 },

    );

  }



  private async loop(): Promise<void> {

    const page = this.page!;

    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: this.task }];



    for (let step = 0; step < env.BROWSER_MAX_STEPS; step++) {

      if (this.cancelled) return;

      // Pause gate: wait while paused (Take over / Pause) until resume or stop.

      while (this.paused && !this.cancelled) {

        await new Promise((r) => setTimeout(r, 120));

      }

      if (this.cancelled) return;

      // Steer injection: add any queued user instructions before this turn.

      while (this.steerQueue.length) {

        messages.push({ role: "user", content: this.steerQueue.shift()! });

      }

      this.pruneImages(messages);

      this.cb.onPhase("thinking", step, env.BROWSER_MAX_STEPS);



      let model = env.ANTHROPIC_BROWSER_MODEL;

      let response: Anthropic.Beta.BetaMessage;

      try {

        response = await this.createBrowserMessage(model, messages);

      } catch (err) {

        if (

          isModelNotFound(err) &&

          env.ANTHROPIC_FALLBACK_MODEL !== model

        ) {

          model = env.ANTHROPIC_FALLBACK_MODEL;

          this.cb.onStatus(`Primary model unavailable — using ${model}.`);

          response = await this.createBrowserMessage(model, messages);

        } else {

          throw err;

        }

      }



      messages.push({ role: "assistant", content: response.content });



      const toolResults: Anthropic.Beta.BetaToolResultBlockParam[] = [];

      let usedTool = false;



      for (const block of response.content) {

        if (block.type === "text" && block.text.trim()) {

          for (const line of block.text.split("\n")) {

            const f = parseFinding(line);

            if (f) {

              this.cb.onFinding({

                id: randomUUID(),

                severity: normalizeSeverity(f.severity),

                title: f.title,

                evidence: f.evidence,

                suggestion: f.suggestion,

                url: page.url(),

                bbox: this.lastBbox,

                frameRef: this.lastTs,

                createdAt: new Date().toISOString(),

              });

            } else if (line.trim()) {

              this.cb.onStatus(line.trim());

            }

          }

        }

        if (block.type === "tool_use" && block.name === "computer") {

          usedTool = true;

          const action = block.input as ComputerAction;



          // Block typing into credential/payment fields.

          if (

            (action.action === "type" || action.action === "key" || action.action === "hold_key") &&

            (await isCredentialFieldFocused(page))

          ) {

            toolResults.push({

              type: "tool_result",

              tool_use_id: block.id,

              content: [

                {

                  type: "text",

                  text: "Blocked: typing into a credential/payment field is not allowed.",

                },

              ],

            });

            continue;

          }



          if (MUTATING_ACTIONS.has(action.action)) {

            const ok = await this.requestApproval(describeAction(action));

            if (this.cancelled) return;

            if (!ok) {

              toolResults.push({

                type: "tool_result",

                tool_use_id: block.id,

                content: [{ type: "text", text: "User rejected this action." }],

              });

              continue;

            }

          }



          this.cb.onPhase("acting", step, env.BROWSER_MAX_STEPS);

          await runAction(page, action);

          await page.waitForTimeout(400);



          // Enforce URL policy after any action that might navigate.

          if (isBlockedUrl(page.url())) {

            await page.goto("about:blank").catch(() => undefined);

            this.cb.onStatus("Navigated away from a restricted site.");

          }



          const shot = await screenshotBase64(page);

          const vp = viewport();

          const cursor = Array.isArray(action.coordinate)
            ? { x: action.coordinate[0] / vp.width, y: action.coordinate[1] / vp.height }
            : undefined;

          const bbox = Array.isArray(action.coordinate)
            ? await bestEffortBbox(page, action.coordinate, vp.width, vp.height)
            : undefined;

          const url = page.url();

          const title = await page.title().catch(() => "");

          this.lastBbox = bbox;

          this.lastTs = new Date().toISOString();

          this.cb.onFrame({
            pngBase64: shot,
            action: describeAction(action),
            actionVerb: verbOf(action),
            cursor,
            bbox,
            url,
            title,
            step,
            stepMax: env.BROWSER_MAX_STEPS,
            phase: "verifying",
            timestamp: this.lastTs,
          });

          if (url !== this.prevUrl) {
            this.cb.onNavigated(url, title);
            this.prevUrl = url;
          }

          toolResults.push({

            type: "tool_result",

            tool_use_id: block.id,

            content: [

              { type: "image", source: { type: "base64", media_type: "image/png", data: shot } },

            ],

          });

        }

      }



      if (!usedTool || response.stop_reason !== "tool_use") return;

      messages.push({ role: "user", content: toolResults });

    }



    this.cb.onStatus("Reached step limit. Stopping.");

  }

}

