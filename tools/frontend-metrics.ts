import {
  ClusterRegistry,
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "@prometheus-io/client";
import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { BlockList, isIP } from "node:net";

export const frontendMetricsPath = "/internal/observability/v1/metrics";

export function validMetricsToken(token: string | undefined): token is string {
  return typeof token === "string" && /^[!-~]{32,256}$/.test(token);
}

function requestGroup(path: string) {
  if (path === "/") return "home";
  if (path.startsWith("/_next/")) return "asset";
  if (/^\/admin(?:\/|$)/.test(path)) return "admin";
  if (path.startsWith("/internal/")) return "internal";
  return "page";
}

export function frontendMetrics(
  token: string | undefined,
  peers: string[],
  aggregate?: () => Promise<string>,
) {
  if (!validMetricsToken(token)) return;
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: "everunfold_node_" });
  if (aggregate) {
    ClusterRegistry.setRegistries(registry);
    // Start the worker-side IPC listener.
    new ClusterRegistry();
  }
  const labels = ["group", "status"] as const;
  const requests = new Counter({
    name: "everunfold_node_http_requests_total",
    help: "Requests completed by the frontend.",
    labelNames: labels,
    registers: [registry],
  });
  const duration = new Histogram({
    name: "everunfold_node_http_request_duration_seconds",
    help: "Time until the frontend completed the response.",
    labelNames: labels,
    registers: [registry],
  });
  const secret = Buffer.from("Bearer " + token);
  const allowed = new BlockList();
  for (const entry of peers) {
    const [address, prefix] = entry.split("/");
    const family = isIP(address) === 6 ? "ipv6" : "ipv4";
    if (prefix === undefined) allowed.addAddress(address, family);
    else allowed.addSubnet(address, Number(prefix), family);
  }
  return {
    async handle(req: IncomingMessage, res: ServerResponse) {
      const presented = Buffer.from(req.headers.authorization ?? "");
      const peer = req.socket.remoteAddress?.replace(/^::ffff:/, "") ?? "";
      const permitted =
        !!isIP(peer) && allowed.check(peer, isIP(peer) === 6 ? "ipv6" : "ipv4");
      res.setHeader("Cache-Control", "no-store");
      if (
        !permitted ||
        req.method !== "GET" ||
        presented.length !== secret.length ||
        !timingSafeEqual(presented, secret)
      ) {
        res.writeHead(403).end();
        return;
      }
      try {
        const body = await (aggregate ? aggregate() : registry.metrics());
        res.writeHead(200, { "Content-Type": registry.contentType }).end(body);
      } catch {
        res.writeHead(503).end();
      }
    },
    observe(path: string, response: ServerResponse) {
      if (path === "/health/ready") return;
      const start = performance.now();
      response.once("finish", () => {
        const group = requestGroup(path);
        const status = Math.floor(response.statusCode / 100) + "xx";
        requests.inc({ group, status });
        duration.observe({ group, status }, (performance.now() - start) / 1000);
      });
    },
  };
}
