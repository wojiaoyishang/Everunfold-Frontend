import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { NextRequest } from "next/server.js";

const root = await fs.mkdtemp(
  path.join(tmpdir(), "everunfold-local-recovery-"),
);
const origin = "http://127.0.0.1:3000";
const password = "synthetic-local-password";
const secret = randomBytes(32).toString("base64url");
const salt = randomBytes(16);
const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 32).toString("hex")}`;
const filename = path.join(root, "connections.toml");
const configFile = path.join(root, "config.toml");
process.env.CONFIG_FILE = configFile;
process.env.LOCAL_RECOVERY_SECRET = secret;
delete process.env.BACKEND_BASE_URL;
delete process.env.PUBLIC_SITE_URL;
await fs.writeFile(
  configFile,
  `
PUBLIC_SITE_URL = "${origin}"
FRONTEND_NODE_ID = "recovery"
backend_node_file = ${JSON.stringify(filename)}
[cache]
directory = ${JSON.stringify(path.join(root, "cache"))}
[settings]
directory = ${JSON.stringify(path.join(root, "settings"))}
[nodes_monitor]
enabled = true
password_hash = "${hash}"
session_secret_env = "LOCAL_RECOVERY_SECRET"
`,
);
await fs.writeFile(
  filename,
  `active = "main"\n` +
    ["main", "backup"]
      .map(
        (id) => `
[profiles.${id}]
BACKEND_BASE_URL = "https://${id}.example.test"
source_epoch = "00000000-0000-0000-0000-000000000001"
[profiles.${id}.backend]
base_url = "http://127.0.0.1:1"
allowed_peer_ips = ["127.0.0.1"]
`,
      )
      .join(""),
);
const imported = await import(
  pathToFileURL(
    path.resolve("src/app/(node-console)/admin/%5Fnodes/local/route.ts"),
  ).href
);
const { GET, POST } = imported.default ?? imported;
const request = (body, cookie = "", from = origin) =>
  new NextRequest(origin + "/admin/_nodes/local", {
    method: body ? "POST" : "GET",
    headers: {
      Host: "127.0.0.1:3000",
      Origin: from,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const { acceptsNodeConsolePeer, withNodeRequestPeer } = await import(
  pathToFileURL(path.resolve("src/server/nodes/request-peer.ts")).href
).then((module) => module.default ?? module);
const allowlist = {
  allowedPeerIps: ["172.28.0.0/16", "2001:db8::1"],
  trustedTlsProxyIps: [],
};
const consoleAllowed = (remoteAddress, config = allowlist) =>
  withNodeRequestPeer(
    {
      socket: { remoteAddress },
      headers: { "x-forwarded-for": "172.28.0.10" },
    },
    () => acceptsNodeConsolePeer(config),
  );
assert.equal(consoleAllowed("::ffff:172.28.0.10"), true);
assert.equal(consoleAllowed("2001:db8::1"), true);
assert.equal(consoleAllowed("172.29.0.10"), false);
assert.equal(acceptsNodeConsolePeer(allowlist), false);
assert.equal(
  consoleAllowed("172.28.0.10", {
    ...allowlist,
    origin: "https://console.example.test",
    trustedTlsProxyIps: ["172.28.0.10"],
  }),
  false,
);
const originalFetch = globalThis.fetch;
const originalOpen = fs.open;
try {
  for (const status of [403, 500, 302]) {
    globalThis.fetch = async () => new Response("unavailable", { status });
    const gate = await (await GET(request())).json();
    assert.equal(gate.mode, "unavailable");
    assert.equal(gate.passwordConfigured, true);
    assert.equal(gate.unlocked, false);
  }
  globalThis.fetch = async () => {
    throw new TypeError("offline", { cause: { code: "ECONNREFUSED" } });
  };
  assert.equal((await (await GET(request())).json()).mode, "offline");
  // Local login/inspection do not contact the backend, even when it rejects HTTP.
  globalThis.fetch = async () => {
    throw new Error("local operation must not probe backend");
  };
  assert.equal(
    (await POST(request({ action: "login", password: "wrong" }))).status,
    401,
  );
  assert.equal(
    (
      await POST(
        request({ action: "login", password }, "", "http://evil.example"),
      )
    ).status,
    403,
  );
  const login = await POST(request({ action: "login", password }));
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";", 1)[0];
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
  assert.equal((await POST(request({ action: "inspect" }))).status, 403);
  const local = await (
    await POST(request({ action: "inspect" }, cookie))
  ).json();
  assert.equal(local.active, "main");
  globalThis.fetch = async () =>
    Response.json({
      success: true,
      data: { status: "alive", stage: "browser-auth" },
    });
  const online = await GET(request(undefined, cookie));
  const gate = await online.json();
  assert.equal(gate.mode, "online");
  assert.equal(gate.unlocked, true);
  assert.equal(online.headers.get("set-cookie"), null);
  for (const [code, text] of [
    ["EROFS", "只读挂载"],
    ["EACCES", "UID/GID"],
  ]) {
    fs.open = async () => {
      throw Object.assign(new Error("private-storage-message"), { code });
    };
    const response = await POST(
      request(
        { action: "switch", profile: "backup", revision: local.revision },
        cookie,
      ),
    );
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.ok(body.includes(text));
    assert.ok(!body.includes("private-storage-message"));
    assert.match(await fs.readFile(filename, "utf8"), /active = "main"/);
  }
  fs.open = originalOpen;
  const switched = await POST(
    request(
      { action: "switch", profile: "backup", revision: local.revision },
      cookie,
    ),
  );
  assert.equal(switched.status, 200);
  assert.match(await fs.readFile(filename, "utf8"), /active = "backup"/);
  assert.equal(
    (await POST(request({ action: "inspect" }, cookie))).status,
    403,
  );
  console.log("local recovery checks passed");
} finally {
  globalThis.fetch = originalFetch;
  fs.open = originalOpen;
  await fs.rm(root, { recursive: true, force: true });
}
