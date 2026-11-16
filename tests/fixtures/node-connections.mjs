import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { NextRequest } from "next/server.js";
import { parse } from "yaml";
const root = await fs.mkdtemp(path.join(tmpdir(), "everunfold-connections-"));
const configFile = path.join(root, "selected.yaml");
const salt = randomBytes(16),
  password = "synthetic-local-password";
const secret = randomBytes(32).toString("base64url");
const inbound = randomBytes(32).toString("base64url"),
  outbound = randomBytes(32).toString("base64url");
const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 32).toString("hex")}`;
const origin = "http://127.0.0.1:3000";
const epoch = "00000000-0000-0000-0000-000000000001";
process.env.CONFIG_FILE = configFile;
for (const key of [
  "BACKEND_BASE_URL",
  "FRONTEND_NODE_ID",
  "PUBLIC_SITE_URL",
  "TEST_SESSION",
  "INBOUND",
  "OUTBOUND",
])
  delete process.env[key];
await fs.writeFile(
  configFile,
  JSON.stringify(
    {
      version: 1,
      component: "frontend",
      application: {
        BACKEND_BASE_URL: "https://api.example.test",
        PUBLIC_SITE_URL: origin,
        FRONTEND_NODE_ID: "web-main",
        backend: {
          base_url: "http://127.0.0.1:1",
          allowed_peer_ips: ["127.0.0.1"],
          nextjs_to_fastapi_token_env: "INBOUND",
          fastapi_to_nextjs_token_env: "OUTBOUND",
        },
        settings: {
          directory: path.join(root, "settings"),
          source_epoch: epoch,
        },
        cache: { directory: path.join(root, "cache") },
        nodes_monitor: {
          enabled: true,
          password_hash: hash,
          session_secret_env: "TEST_SESSION",
        },
      },
      environment: {
        TEST_SESSION: secret,
        INBOUND: inbound,
        OUTBOUND: outbound,
      },
      docker: {},
      assistant: {},
    },
    null,
    2,
  ),
);
const imported = await import(
  pathToFileURL(
    path.resolve("src/app/(node-console)/admin/%5Fnodes/local/route.ts"),
  ).href
);
const { POST } = imported.default ?? imported;
const request = (body, cookie = "", from = origin) =>
  new NextRequest(origin + "/admin/_nodes/local", {
    method: "POST",
    headers: {
      Host: "127.0.0.1:3000",
      Origin: from,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
const call = (action, cookie = "") => POST(request(action, cookie));
const originalOpen = fs.open,
  originalRename = fs.rename;
const originalFetch = globalThis.fetch;
let child;
async function receiver() {
  child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `
    import {createServer} from 'node:http';
    import runtime from './src/server/settings/runtime.ts';
    const server=createServer(runtime.configuredSettingsRuntime(process.cwd()).handler);
    server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port));
  `,
    ],
    { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let logs = "";
  child.stderr.on("data", (c) => (logs += c));
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("receiver startup timeout: " + logs)),
      5000,
    );
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("receiver exited " + code + ": " + logs));
    });
    child.stdout.on("data", (chunk) => {
      const match = chunk.toString().match(/PORT=(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  return {
    url: `http://127.0.0.1:${port}/internal/settings/status`,
    logs: () => logs,
  };
}
try {
  globalThis.fetch = async () => {
    throw new Error("saving must not contact backend");
  };
  assert.equal((await call({ action: "connections" })).status, 403);
  const login = await call({ action: "login", password });
  assert.equal(login.status, 200);
  let cookie = login.headers.get("set-cookie").split(";")[0];
  const oldCookie = cookie;
  let list = await (await call({ action: "connections" }, cookie)).json();
  assert.equal(list.filename, configFile);
  assert.equal(list.profiles[0].hasInboundToken, true);
  for (const secretValue of [secret, inbound, outbound, hash])
    assert.ok(!JSON.stringify(list).includes(secretValue));
  const draft = {
    ...list.profiles[0],
    internalUrl: "http://everunfold-backend:8001",
    inboundToken: "",
    outboundToken: "",
  };
  const save = () =>
    call(
      {
        action: "save-connection",
        revision: list.revision,
        connection: draft,
        create: false,
      },
      cookie,
    );
  const before = await fs.readFile(configFile, "utf8");
  for (const [code, text] of [
    ["EROFS", "只读挂载"],
    ["EACCES", "UID/GID"],
    ["EBUSY", "bind mount"],
  ]) {
    fs.open =
      code === "EBUSY"
        ? originalOpen
        : async () => {
            throw Object.assign(new Error("do-not-leak"), { code });
          };
    fs.rename =
      code === "EBUSY"
        ? async () => {
            throw Object.assign(new Error("do-not-leak"), { code });
          }
        : originalRename;
    const response = await save();
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.ok(body.includes(text));
    assert.ok(!body.includes("do-not-leak"));
    assert.equal(await fs.readFile(configFile, "utf8"), before);
  }
  fs.open = originalOpen;
  fs.rename = originalRename;
  const bad = { ...draft, internalUrl: "http://user:private@host" };
  assert.equal(
    (
      await call(
        {
          action: "save-connection",
          revision: list.revision,
          connection: bad,
          create: false,
        },
        cookie,
      )
    ).status,
    422,
  );
  assert.equal(await fs.readFile(configFile, "utf8"), before);
  let response = await save();
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).filename, configFile);
  cookie = response.headers.get("set-cookie").split(";")[0];
  assert.equal((await call({ action: "connections" }, oldCookie)).status, 403);
  let doc = parse(await fs.readFile(configFile, "utf8"));
  assert.equal(
    doc.connection_profiles.profiles.main.backend.base_url,
    draft.internalUrl,
  );
  assert.equal(
    doc.environment[
      doc.connection_profiles.profiles.main.backend.nextjs_to_fastapi_token_env
    ],
    inbound,
  );
  assert.equal((await fs.stat(configFile)).mode & 0o777, 0o600);
  assert.equal(
    (
      await call(
        {
          action: "save-connection",
          revision: list.revision,
          connection: draft,
          create: false,
        },
        cookie,
      )
    ).status,
    409,
  );
  list = await (await call({ action: "connections" }, cookie)).json();
  const added = {
    ...draft,
    id: "backup",
    nodeId: "second-node",
    sourceEpoch: "00000000-0000-0000-0000-000000000002",
    inboundToken: randomBytes(32).toString("base64url"),
    outboundToken: randomBytes(32).toString("base64url"),
  };
  response = await call(
    {
      action: "save-connection",
      revision: list.revision,
      connection: added,
      create: true,
    },
    cookie,
  );
  assert.equal(response.status, 200, await response.clone().text());
  cookie = response.headers.get("set-cookie").split(";")[0];
  list = await (await call({ action: "connections" }, cookie)).json();
  assert.equal(list.active, "backup");
  assert.equal(list.profiles.length, 2);
  doc = parse(await fs.readFile(configFile, "utf8"));
  assert.equal(
    doc.connection_profiles.profiles.main.FRONTEND_NODE_ID,
    "web-main",
  );
  assert.equal(
    (
      await POST(
        request(
          {
            action: "save-connection",
            revision: list.revision,
            connection: added,
          },
          cookie,
          "http://evil.example",
        ),
      )
    ).status,
    403,
  );
  // Independent HTTP receiver proves it reads the same YAML and rejects stale credentials until restarted.
  globalThis.fetch = originalFetch;
  let runtime = await receiver();
  let status = await fetch(runtime.url, {
    headers: { Authorization: "Bearer " + added.outboundToken },
  });
  assert.equal(status.status, 200);
  assert.equal((await status.json()).node_id, "second-node");
  const rotated = {
    ...added,
    inboundToken: "",
    outboundToken: randomBytes(32).toString("base64url"),
  };
  response = await call(
    {
      action: "save-connection",
      revision: list.revision,
      connection: rotated,
      create: false,
    },
    cookie,
  );
  assert.equal(response.status, 200, await response.clone().text());
  status = await fetch(runtime.url, {
    headers: { Authorization: "Bearer " + added.outboundToken },
  });
  assert.equal(status.status, 503);
  assert.equal((await status.json()).error, "receiver_restart_required");
  child.kill("SIGTERM");
  await once(child, "exit");
  child = undefined;
  runtime = await receiver();
  status = await fetch(runtime.url, {
    headers: { Authorization: "Bearer " + rotated.outboundToken },
  });
  assert.equal(status.status, 200);
  await status.text();
  status = await fetch(runtime.url, {
    headers: { Authorization: "Bearer " + added.outboundToken },
  });
  assert.equal(status.status, 403);
  await status.text();
  assert.ok(!runtime.logs().includes(rotated.outboundToken));
  console.log(
    "browser connection editing and independent receiver checks passed",
  );
} finally {
  globalThis.fetch = originalFetch;
  fs.open = originalOpen;
  fs.rename = originalRename;
  if (child) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
  await fs.rm(root, { recursive: true, force: true });
}
