import { createServer } from "node:http";
import { parseArgs } from "node:util";
import next from "next";
import { readConfigurationFiles } from "../src/core/config/files";
import { frontendHandler } from "../src/server/http";
import { configuredSettingsHandler } from "../src/server/settings/runtime";

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
console.info("Everunfold Frontend · CONFIG_FILE=" + file.filename);
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
server.on(
  "request",
  frontendHandler(app.getRequestHandler(), configuredSettingsHandler(root)),
);
// Next installs its HMR upgrade handler on this server when handling a web request.
server.on("error", () => {
  console.error(
    "Everunfold Frontend: 无法监听，请检查绑定地址和端口是否已被占用。",
  );
  process.exit(1);
});
server.listen(port, host, () => {
  console.log(
    `Everunfold Frontend ready: ${host}:${port} (web + internal sync)`,
  );
});
let closing = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
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
