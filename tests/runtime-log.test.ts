import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { frontendHTTPAccess } from "../src/server/http-access";
import { runtimeLogger } from "../src/server/runtime-log";

test("access logs retain request diagnostics without query values", async (t) => {
  const lines: string[] = [];
  const logged = Promise.withResolvers<void>();
  t.mock.method(console, "info", (line: string) => {
    lines.push(line);
    logged.resolve();
  });
  t.mock.method(console, "warn", (line: string) => lines.push(line));
  const format = process.env.EVERUNFOLD_LOG_FORMAT;
  delete process.env.EVERUNFOLD_LOG_FORMAT;
  t.after(() => {
    if (format !== undefined) process.env.EVERUNFOLD_LOG_FORMAT = format;
  });
  const access = frontendHTTPAccess({
    baseUrl: "",
    nodeId: "log-tests",
    inboundToken: "",
    outboundToken: "",
  });
  const server = createServer((request, response) => {
    access.observe(request, response, request.url!.split("?", 1)[0]);
    response.end();
  });
  server.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  const response = await fetch(
    `http://127.0.0.1:${port}/health/live?token=private-query`,
    { headers: { "User-Agent": "Everunfold-Test/1.0" } },
  );
  await response.text();
  await logged.promise;
  assert.equal(response.status, 200);
  runtimeLogger.warn("published", "已发布", { symbol: "文章.publish" });
  assert.equal(lines.length, 2);
  const [accessRecord, appRecord] = lines.map((line) => JSON.parse(line));
  assert.equal(accessRecord.request_url, "/health/live");
  assert.equal(accessRecord.user_agent, "Everunfold-Test/1.0");
  assert.equal(accessRecord.node_id, "log-tests");
  assert.equal(accessRecord.outcome, "completed");
  assert.match(accessRecord.request_id, /^[a-f0-9]{32}$/);
  assert.ok(accessRecord.duration_ms >= 0);
  assert.ok(!lines[0].includes("private-query"));
  assert.equal(appRecord.symbol, "文章.publish");
  assert.equal(appRecord.level, "warning");
});
