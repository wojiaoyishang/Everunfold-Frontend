import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);

test("deployment sync uses the active profile and only reports a verified queue acknowledgement", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-trigger-sync-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const token = "synthetic-sync-trigger-token-".repeat(2);
  const requests: { method?: string; url?: string; token?: string }[] = [];
  let status = 200;
  const acknowledgement = {
    success: true,
    code: 200,
    data: { node_id: "active-node", queued: true },
  };
  let body = JSON.stringify(acknowledgement);
  const backend = createServer((request, response) => {
    requests.push({
      method: request.method,
      url: request.url,
      token: request.headers.authorization,
    });
    request.resume();
    response.writeHead(status, {
      "Content-Type": "application/json",
      ...(status === 302 ? { Location: "/redirect-check" } : {}),
    });
    response.end(body);
  });
  backend.listen(0, "127.0.0.1");
  await once(backend, "listening");
  t.after(() => new Promise<void>((resolve) => backend.close(() => resolve())));
  const origin = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`;
  const config = path.join(root, "active-config.yaml");
  const helper = path.join(root, "mounted-helper.mjs");
  await copyFile("tools/trigger-sync.mjs", helper);
  const profile = (id: string, baseUrl: string, tokenReference: string) => ({
    FRONTEND_NODE_ID: id,
    BACKEND_BASE_URL: "https://public.example.test",
    source_epoch: "12345678-1234-1234-1234-123456789abc",
    backend: { base_url: baseUrl, nextjs_to_fastapi_token_env: tokenReference },
  });
  await writeFile(
    config,
    JSON.stringify({
      version: 1,
      component: "frontend",
      application: {},
      environment: {
        ACTIVE_TEST_TOKEN: token,
        OTHER_TEST_TOKEN: "unused-sync-trigger-token-".repeat(2),
      },
      connection_profiles: {
        active: "target",
        profiles: {
          target: profile("active-node", origin, "ACTIVE_TEST_TOKEN"),
          other: profile(
            "other-node",
            "http://127.0.0.1:1",
            "OTHER_TEST_TOKEN",
          ),
        },
      },
    }),
  );
  const trigger = (...args: string[]) =>
    run(
      process.execPath,
      ["--import", "tsx", ...(args.length ? args : [helper])],
      {
        env: { CONFIG_FILE: config, NODE_ENV: "test", PATH: process.env.PATH },
      },
    );
  const result = await trigger();
  assert.match(result.stdout, /active-node.*已入队/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(token));
  const expectedRequest = {
    method: "POST",
    url: "/internal/frontend-nodes/active-node/sync",
    token: `Bearer ${token}`,
  };
  assert.deepEqual(requests, [expectedRequest]);
  const fromStdin = trigger("--input-type=module");
  fromStdin.child.stdin?.end(await readFile(helper));
  assert.match((await fromStdin).stdout, /active-node.*已入队/);

  const expectFailure = async (diagnostic: RegExp) => {
    await assert.rejects(trigger(), (error: Error) => {
      const result = error as Error & {
        code: number;
        stdout: string;
        stderr: string;
      };
      assert.equal(result.code, 1);
      assert.match(result.stderr, diagnostic);
      assert.doesNotMatch(result.stdout + result.stderr, new RegExp(token));
      return true;
    });
  };
  status = 302;
  await expectFailure(/重定向/);
  status = 403;
  body = token;
  await expectFailure(/后端拒绝请求/);
  status = 200;
  body = JSON.stringify({
    ...acknowledgement,
    data: { node_id: "other-node", queued: true },
  });
  await expectFailure(/未确认任务入队/);
  assert.deepEqual(requests, Array(5).fill(expectedRequest));
});
