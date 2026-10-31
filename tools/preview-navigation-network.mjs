/** Local-only network fault proxy. No fault switches or endpoints ship in the app.
 * Run: node tools/preview-navigation-network.mjs [listenPort=3901] [upstreamPort=3000]
 * stdin JSON: {"path":"/where-i-go.html","delay":6500,"status":503,"phase":"prepare"}
 * Omit status for success; phase may be prepare or rsc. {} clears; quit stops.
 */
import http from "node:http";
import { createInterface } from "node:readline";
const port = Number(process.argv[2] ?? 3901);
const upstreamPort = Number(process.argv[3] ?? 3000);
if (
  ![port, upstreamPort].every(
    (value) => Number.isInteger(value) && value > 1024 && value < 65536,
  ) ||
  port === upstreamPort
)
  throw new Error("Use two distinct local ports");
let scenario = {};
const sockets = new Set();
const forwardOptions = (request) => ({
  hostname: "127.0.0.1",
  port: upstreamPort,
  path: request.url,
  method: request.method,
  headers: { ...request.headers, host: `127.0.0.1:${upstreamPort}` },
});
const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
  const phase =
    request.headers["x-everunfold-navigation"] === "prepare"
      ? "prepare"
      : request.headers.rsc === "1"
        ? "rsc"
        : "other";
  const fault =
    scenario.path &&
    encodeURI(decodeURI(scenario.path)) === pathname &&
    phase === (scenario.phase ?? "prepare")
      ? { ...scenario }
      : null;
  if (fault) {
    console.log(
      JSON.stringify({
        phase,
        path: pathname,
        delay: fault.delay ?? 0,
        status: fault.status ?? 200,
      }),
    );
    await new Promise((resolve) => {
      const timer = setTimeout(
        resolve,
        Math.min(30000, Math.max(0, fault.delay ?? 0)),
      );
      response.once("close", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    if (response.destroyed) return;
    if (fault.disconnect) {
      response.destroy();
      return;
    }
    if (fault.status) {
      response.writeHead(fault.status, {
        "content-type": "text/html",
        "cache-control": "no-store",
      });
      response.end("<!doctype html><title>Local QA failure</title>");
      return;
    }
  }
  const upstream = http.request(forwardOptions(request), (result) => {
    response.writeHead(result.statusCode ?? 502, result.headers);
    result.pipe(response);
  });
  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502);
    response.end();
  });
  response.on("close", () => upstream.destroy());
  request.pipe(upstream);
});
server.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});
server.on("upgrade", (request, client, head) => {
  const upstream = http.request(forwardOptions(request));
  upstream.on("upgrade", (response, socket, upstreamHead) => {
    client.write(
      `HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n${Object.entries(
        response.headers,
      )
        .map(([key, value]) => `${key}: ${value}`)
        .join("\r\n")}\r\n\r\n`,
    );
    if (head.length) socket.write(head);
    if (upstreamHead.length) client.write(upstreamHead);
    socket.pipe(client).pipe(socket);
    socket.on("error", () => client.destroy());
    client.on("error", () => socket.destroy());
  });
  upstream.on("error", () => client.destroy());
  upstream.end();
});
const commands = createInterface({ input: process.stdin });
commands.on("line", (line) => {
  if (line.trim() === "quit") {
    sockets.forEach((socket) => socket.destroy());
    server.close();
    commands.close();
    return;
  }
  try {
    scenario = JSON.parse(line);
    console.log("QA scenario updated");
  } catch {
    console.log("Expected JSON or quit");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Network QA: http://127.0.0.1:${port}, forwarding to ${upstreamPort}`,
  ),
);
