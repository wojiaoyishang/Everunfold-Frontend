import { createServer } from "node:http";
import { parseArgs } from "node:util";
import next from "next";
import { readConfigurationFiles } from "../src/core/config/files";
import { frontendHandler } from "../src/server/http";
import { configuredSettingsRuntime } from "../src/server/settings/runtime";
import { frontendClusterClient } from "./frontend-cluster";
import { configurationEnvironment } from "../src/core/config/deployment";
import { frontendMetrics, frontendMetricsPath } from "./frontend-metrics";
import { frontendHTTPAccess } from "../src/server/http-access";
import { runtimeLog } from "../src/server/runtime-log";

const { values } = parseArgs({
  options: {
    dev: { type: "boolean", default: false },
    port: { type: "string", short: "p" },
    hostname: { type: "string", short: "H" },
  },
});
if (values.port !== undefined) process.env.FRONTEND_PORT = values.port;
if (values.hostname !== undefined) process.env.FRONTEND_HOST = values.hostname;
const root = process.env.EVERUNFOLD_PROJECT_ROOT ?? process.cwd();
const { settings: config, file } = readConfigurationFiles(root);
const { host, port } = config.listener;
const cluster = frontendClusterClient();
const runtime = configuredSettingsRuntime(root, cluster);
const environment = configurationEnvironment(config);
const access = frontendHTTPAccess({
  baseUrl: config.backend.baseUrl,
  nodeId: config.frontendNodeId,
  inboundToken: environment[config.backend.fastapiToNextjsTokenEnv ?? ""] ?? "",
  outboundToken:
    environment[config.backend.nextjsToFastapiTokenEnv ?? ""] ?? "",
});
const monitor = frontendMetrics(
  environment.EVERUNFOLD_METRICS_NODE_TOKEN,
  config.backend.allowedPeerIps,
  cluster?.metrics,
);
runtimeLog("info", "startup", "前端加载运行配置", {
  config_file: file.filename,
});
const server = createServer({
  maxHeaderSize: 8192,
  requestTimeout: 10000,
  headersTimeout: 5000,
});
const app = next({
  dev: values.dev,
  dir: root,
  hostname: host,
  port,
  httpServer: server,
});
await app.prepare();
const handler = frontendHandler(
  app.getRequestHandler(),
  runtime.handler,
  runtime.visit,
);
server.on("request", (request, response) => {
  const path = (request.url ?? "/").split("?", 1)[0];
  if (access.observe(request, response, path)) return;
  if (monitor && path === frontendMetricsPath) {
    void monitor.handle(request, response);
    return;
  }
  monitor?.observe(path, response);
  void handler(request, response);
});
// Next installs its HMR upgrade handler on this server when handling a web request.
server.on("error", () => {
  runtimeLog(
    "error",
    "listen_failed",
    "Everunfold Frontend: 无法监听，请检查绑定地址和端口是否已被占用。",
  );
  process.exit(1);
});
server.listen(port, host, () => {
  runtime.start();
  access.start();
  runtimeLog(
    "info",
    "ready",
    `Everunfold Frontend ready: ${host}:${port} (web + internal sync, pid ${process.pid})`,
  );
});
let closing = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    runtime.stop();
    access.stop();
    const deadline = setTimeout(() => process.exit(1), 30000);
    deadline.unref();
    void Promise.all([
      new Promise<void>((resolve) => server.close(() => resolve())),
      app.close(),
    ]).then(
      () => {
        clearTimeout(deadline);
        process.exit(0);
      },
      () => process.exit(1),
    );
    server.closeIdleConnections();
  });
}
