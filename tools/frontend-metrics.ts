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

const internalMetricsPath = "/internal/observability/v1/metrics";
const directMetricsPath = "/metrics";

function validMetricsToken(token: string | undefined): token is string {
  return typeof token === "string" && /^[!-~]{32,256}$/.test(token);
}

type Environment = Record<string, string | undefined>;

export function frontendMetricsEnabled(env: Environment) {
  return [
    env.EVERUNFOLD_METRICS_NODE_TOKEN,
    env.EVERUNFOLD_FRONTEND_METRICS_TOKEN,
  ].some(validMetricsToken);
}

function metricsAccess(
  token: string | undefined,
  setting: string,
  env: Environment,
  fallback: string[],
) {
  if (!validMetricsToken(token)) return;
  const explicit = env[setting]?.trim();
  const peers = explicit
    ? explicit
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : fallback;
  const networks = { ipv4: new BlockList(), ipv6: new BlockList() };
  for (const entry of peers) {
    const [address, prefix, extra] = entry.split("/");
    const version = isIP(address);
    if (
      !version ||
      address.includes("%") ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d{1,3}$/.test(prefix) ||
          Number(prefix) > (version === 6 ? 128 : 32) ||
          (explicit && Number(prefix) === 0)))
    ) {
      throw new Error(`${setting} 必须填写有效的受限 IP/CIDR。`);
    }
    const family = version === 6 ? "ipv6" : "ipv4";
    if (prefix === undefined) networks[family].addAddress(address, family);
    else networks[family].addSubnet(address, Number(prefix), family);
  }
  const secret = Buffer.from("Bearer " + token);
  return (request: IncomingMessage) => {
    const presented = Buffer.from(request.headers.authorization ?? "");
    const peer = request.socket.remoteAddress?.replace(/^::ffff:/, "") ?? "";
    const version = isIP(peer);
    const family = version === 6 ? "ipv6" : "ipv4";
    return (
      request.method === "GET" &&
      !!version &&
      networks[family].check(peer, family) &&
      presented.length === secret.length &&
      timingSafeEqual(presented, secret)
    );
  };
}

function requestGroup(path: string) {
  if (path === "/") return "home";
  if (path.startsWith("/_next/")) return "asset";
  if (/^\/admin(?:\/|$)/.test(path)) return "admin";
  if (path.startsWith("/internal/")) return "internal";
  return "page";
}

export function frontendMetrics(
  env: Environment,
  peers: string[],
  aggregate?: () => Promise<string>,
) {
  if (!frontendMetricsEnabled(env)) return;
  const internal = env.EVERUNFOLD_METRICS_NODE_TOKEN;
  const direct = env.EVERUNFOLD_FRONTEND_METRICS_TOKEN;
  if (validMetricsToken(internal) && internal === direct)
    throw new Error("前端独立指标令牌与内部指标令牌必须不同。");
  const access = new Map([
    [
      internalMetricsPath,
      metricsAccess(
        internal,
        "EVERUNFOLD_METRICS_NODE_ALLOWED_PEERS",
        env,
        peers,
      ),
    ],
    [
      directMetricsPath,
      metricsAccess(direct, "EVERUNFOLD_FRONTEND_METRICS_ALLOWED_PEERS", env, [
        "127.0.0.1",
        "::1",
      ]),
    ],
  ]);
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
  return {
    handle(path: string, req: IncomingMessage, res: ServerResponse) {
      const authorized = access.get(path);
      if (!authorized) return false;
      res.setHeader("Cache-Control", "no-store");
      if (!authorized(req)) {
        res.writeHead(403).end();
        return true;
      }
      void (aggregate ? aggregate() : registry.metrics()).then(
        (body) =>
          res
            .writeHead(200, { "Content-Type": registry.contentType })
            .end(body),
        () => res.writeHead(503).end(),
      );
      return true;
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
