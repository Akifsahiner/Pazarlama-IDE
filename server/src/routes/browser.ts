import type { FastifyInstance } from "fastify";
import { DEV_USER_ID, devAuthBypass } from "../auth/devBypass.js";
import { env, hasAnthropic, hasJwt } from "../env.js";
import { verifySupabaseAccessToken, verifySupabaseJwt } from "../auth/jwt.js";
import { assertTierAndQuota, TierRequiredError } from "../middleware/tierGate.js";
import { QuotaExceededError } from "../middleware/quota.js";
import { ComputerUseSession } from "../browser/session.js";
import { canStartSession } from "../browser/registry.js";
import { persistenceEnabled } from "../db/client.js";
import * as usage from "../db/repos/usage.js";
import type { Persona } from "../browser/types.js";

interface StartMsg { type: "start"; task: string; autoApprove?: boolean; persona?: Persona }
interface ApproveMsg { type: "approve"; id: string }
interface RejectMsg { type: "reject"; id: string }
interface AutoMsg { type: "set_auto"; value: boolean }
interface PauseMsg { type: "pause" }
interface ResumeMsg { type: "resume" }
interface SteerMsg { type: "steer"; text: string }
interface StopMsg { type: "stop" }
interface AuthMsg { type: "auth"; token: string }
type ClientMsg =
  | StartMsg
  | ApproveMsg
  | RejectMsg
  | AutoMsg
  | PauseMsg
  | ResumeMsg
  | SteerMsg
  | StopMsg
  | AuthMsg;

function isAuthed(token: string | undefined): boolean {
  if (devAuthBypass()) return true;
  if (hasJwt && token) return !!verifySupabaseJwt(token);
  if (env.API_TOKEN && token === env.API_TOKEN) return true;
  if (!hasJwt && !env.API_TOKEN) return true;
  return false;
}

async function isAuthedAsync(token: string | undefined): Promise<boolean> {
  if (devAuthBypass()) return true;
  if (hasJwt && token) return !!(await verifySupabaseAccessToken(token));
  if (env.API_TOKEN && token === env.API_TOKEN) return true;
  if (!hasJwt && !env.API_TOKEN) return true;
  return false;
}

function resolveUserId(token: string | undefined): string | null {
  if (devAuthBypass()) return DEV_USER_ID;
  if (hasJwt && token) return verifySupabaseJwt(token)?.id ?? null;
  if (env.API_TOKEN && token === env.API_TOKEN) return DEV_USER_ID;
  if (!hasJwt && !env.API_TOKEN) return DEV_USER_ID;
  return null;
}

async function resolveUserIdAsync(token: string | undefined): Promise<string | null> {
  if (devAuthBypass()) return DEV_USER_ID;
  if (hasJwt && token) return (await verifySupabaseAccessToken(token))?.id ?? null;
  if (env.API_TOKEN && token === env.API_TOKEN) return DEV_USER_ID;
  if (!hasJwt && !env.API_TOKEN) return DEV_USER_ID;
  return null;
}

export async function browserRoutes(app: FastifyInstance): Promise<void> {
  app.get("/browser", { websocket: true }, (socket, req) => {
    const queryToken = (req.query as { token?: string }).token ?? "";
    let token = queryToken;
    let authed = isAuthed(queryToken);
    let userId = resolveUserId(queryToken);

    let session: ComputerUseSession | null = null;
    let startedAt = 0;
    let pendingStart: StartMsg | null = null;

    const send = (obj: unknown) => {
      if (socket.readyState === 1) socket.send(JSON.stringify(obj));
    };

    const handleStart = async (msg: StartMsg): Promise<void> => {
      if (!hasAnthropic) {
        send({ type: "error", message: "ANTHROPIC_API_KEY is not configured on the server" });
        return;
      }
      if (userId) {
        try {
          await assertTierAndQuota(userId, "browser_min");
        } catch (err) {
          if (err instanceof TierRequiredError) {
            send({
              type: "error",
              message: `Upgrade to ${err.upgradeTo} to use browser research.`,
            });
            return;
          }
          if (err instanceof QuotaExceededError) {
            send({ type: "error", message: "Monthly browser quota exceeded." });
            return;
          }
          throw err;
        }
      }
      if (!session && !canStartSession()) {
        send({ type: "error", message: "Server is at capacity for browser sessions. Try again shortly." });
        return;
      }
      if (session) await session.stop();

      startedAt = Date.now();
      session = new ComputerUseSession(
        msg.task,
        msg.autoApprove ?? false,
        {
          onStatus: (message) => send({ type: "status", message }),
          onFrame: (meta) => send({ type: "frame", ...meta }),
          onPhase: (phase, step, stepMax) => send({ type: "status", phase, step, stepMax }),
          onNavigated: (url, title) => send({ type: "navigated", url, title }),
          onFinding: (finding) => send({ type: "finding", finding }),
          onApprovalRequest: (id, summary) => send({ type: "approval_request", id, summary }),
          onPaused: () => send({ type: "paused" }),
          onResumed: () => send({ type: "resumed" }),
          onDone: async () => {
            if (userId && persistenceEnabled && startedAt) {
              await usage.insert(userId, { kind: "browser", browser_ms: Date.now() - startedAt }).catch(() => {});
            }
            send({ type: "done" });
          },
          onError: (message) => send({ type: "error", message }),
        },
        msg.persona ?? "marketing",
      );
      void session.start();
    };

    // Open dev / query-token auth: client can start immediately.
    if (authed) send({ type: "ready" });

    socket.on("message", async (raw: Buffer) => {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(raw.toString()) as ClientMsg;
      } catch {
        return;
      }

      if (msg.type === "auth") {
        token = msg.token ?? "";
        authed = await isAuthedAsync(token);
        userId = await resolveUserIdAsync(token);
        if (!authed) {
          send({ type: "error", message: "unauthorized" });
          socket.close();
          return;
        }
        send({ type: "ready" });
        if (pendingStart) {
          const start = pendingStart;
          pendingStart = null;
          await handleStart(start);
        }
        return;
      }

      if (msg.type === "start") {
        if (!authed) {
          pendingStart = msg;
          return;
        }
        await handleStart(msg);
      } else if (!authed) {
        send({ type: "error", message: "unauthorized" });
        socket.close();
      } else if (msg.type === "approve") {
        session?.resolveApproval(msg.id, true);
      } else if (msg.type === "reject") {
        session?.resolveApproval(msg.id, false);
      } else if (msg.type === "set_auto") {
        session?.setAutoApprove(msg.value);
      } else if (msg.type === "pause") {
        session?.pause();
      } else if (msg.type === "resume") {
        session?.resume();
      } else if (msg.type === "steer") {
        session?.steer(msg.text);
      } else if (msg.type === "stop") {
        if (userId && persistenceEnabled && startedAt) {
          await usage.insert(userId, { kind: "browser", browser_ms: Date.now() - startedAt }).catch(() => {});
          startedAt = 0;
        }
        await session?.stop();
        session = null;
      }
    });

    socket.on("close", async () => {
      if (userId && persistenceEnabled && startedAt) {
        await usage.insert(userId, { kind: "browser", browser_ms: Date.now() - startedAt }).catch(() => {});
      }
      await session?.stop();
      session = null;
    });
  });
}
