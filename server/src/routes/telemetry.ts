import type { FastifyInstance } from "fastify";
import { z } from "zod";

const telemetryEvent = z.object({
  event: z.string().min(1).max(120),
  props: z.record(z.string(), z.unknown()).optional(),
  ts: z.string().datetime().optional(),
  clientVersion: z.string().max(32).optional(),
});

const telemetryBody = z.object({
  events: z.array(telemetryEvent).min(1).max(50),
});

/** Opt-in anonymous product telemetry — logged server-side, no PII persistence. */
export async function telemetryRoutes(app: FastifyInstance): Promise<void> {
  app.post("/telemetry", async (req, reply) => {
    const parsed = telemetryBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", detail: parsed.error.flatten() });
    }
    const userId = req.user?.id ?? "anonymous";
    for (const evt of parsed.data.events) {
      app.log.info(
        {
          telemetry: true,
          userId,
          event: evt.event,
          props: evt.props ?? {},
          clientVersion: evt.clientVersion,
          ts: evt.ts ?? new Date().toISOString(),
        },
        "product_telemetry",
      );
    }
    return { ok: true, accepted: parsed.data.events.length };
  });
}
