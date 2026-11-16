import type { IncomingMessage, ServerResponse } from "node:http";
import { syncFailure } from "./sync-diagnostics";

type Handler = (request: IncomingMessage, response: ServerResponse) => unknown;

/** Reserve every internal path before Next.js sees or rewrites the request. */
export function frontendHandler(web: Handler, internal: Handler) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      await (
        path === "/internal" || path.startsWith("/internal/") ? internal : web
      )(request, response);
    } catch (error) {
      if (request.url?.startsWith("/internal"))
        syncFailure(
          {
            direction: "backend_to_frontend",
            operation: "internal request",
            peer: request.socket.remoteAddress,
            status: 503,
          },
          "frontend_unavailable",
          error,
        );
      if (response.headersSent) response.destroy();
      else {
        response.writeHead(503, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        response.end(JSON.stringify({ error: "frontend_unavailable" }));
      }
    }
  };
}
