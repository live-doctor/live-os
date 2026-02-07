export type SseEvent = {
  id?: string;
  event?: string;
  retry?: number;
  data: unknown;
};

export type SseSend = (event: SseEvent) => void;

function formatSse(event: SseEvent): string {
  const lines: string[] = [];
  if (typeof event.retry === "number") lines.push(`retry: ${event.retry}`);
  if (event.id) lines.push(`id: ${event.id}`);
  if (event.event) lines.push(`event: ${event.event}`);

  const data =
    typeof event.data === "string" ? event.data : JSON.stringify(event.data);
  for (const line of data.split("\n")) lines.push(`data: ${line}`);
  lines.push("");

  return lines.join("\n");
}

export function createSseResponse(
  req: Request,
  handler: (ctx: {
    send: SseSend;
    signal: AbortSignal;
  }) => void | Promise<void>,
  options?: { heartbeatMs?: number },
): Response {
  const heartbeatMs = options?.heartbeatMs ?? 15_000;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send: SseSend = (event) => {
        controller.enqueue(encoder.encode(formatSse(event)));
      };

      // Keep-alive comments to avoid idle connection timeouts.
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
      }, heartbeatMs);

      const onAbort = () => {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // no-op
        }
      };

      req.signal.addEventListener("abort", onAbort, { once: true });

      Promise.resolve(handler({ send, signal: req.signal })).catch(() => {
        // If handler fails, close the stream. Consumers will reconnect.
        onAbort();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
