import type { FastifyReply } from "fastify";

export interface SSEChannel {
  send: (event: unknown) => void;
  end: () => void;
  closed: () => boolean;
  /** Aborts when the client disconnects — pass to LLM SDK calls to cancel work. */
  signal: AbortSignal;
}

export function startSSE(reply: FastifyReply): SSEChannel {
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const controller = new AbortController();
  let closed = false;
  res.on("close", () => {
    closed = true;
    controller.abort();
  });

  // Heartbeat keeps proxies from closing idle streams.
  const heartbeat = setInterval(() => {
    if (!closed) res.write(": ping\n\n");
  }, 15_000);
  heartbeat.unref();

  return {
    send: (event) => {
      if (!closed) res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    end: () => {
      clearInterval(heartbeat);
      if (!closed) res.end();
    },
    closed: () => closed,
    signal: controller.signal,
  };
}
