import type { IncomingMessage, ServerResponse } from "node:http";

type Handler = (request: IncomingMessage, response: ServerResponse) => unknown;

/** Reserve every internal path before Next.js sees or rewrites the request. */
export function frontendHandler(web: Handler, internal: Handler) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      await (
        path === "/internal" || path.startsWith("/internal/") ? internal : web
      )(request, response);
    } catch {
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
