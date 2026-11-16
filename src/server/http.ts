import type { IncomingMessage, ServerResponse } from "node:http";
import { withNodeRequestPeer } from "./nodes/request-peer";
import { syncFailure } from "./sync-diagnostics";

type Handler = (request: IncomingMessage, response: ServerResponse) => unknown;

function publicRead(request: IncomingMessage, pathname: string): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (
    /^\/(?:_|admin(?:\/|$)|account(?:\/|$)|login(?:\/|$)|health(?:\/|$))/.test(
      pathname,
    )
  )
    return false;
  return (
    pathname === "/" ||
    request.headers.rsc === "1" ||
    request.headers.accept?.includes("text/html") === true ||
    ["/feed.xml", "/atom.xml", "/sitemap.xml"].includes(pathname)
  );
}

/** Reserve every internal path before Next.js sees or rewrites the request. */
export function frontendHandler(
  web: Handler,
  internal: Handler,
  onVisit?: () => void,
) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      if (path === "/internal" || path.startsWith("/internal/"))
        await internal(request, response);
      else {
        if (onVisit && publicRead(request, path)) onVisit();
        await withNodeRequestPeer(request, () => web(request, response));
      }
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
