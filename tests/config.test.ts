import assert from "node:assert/strict";
import test from "node:test";
import { browserBackendBaseUrl } from "../src/core/config/browser-api";
import { parseConfiguration } from "../src/core/config/schema";

const base = {
  BACKEND_BASE_URL: "http://127.0.0.1:8000",
  FRONTEND_NODE_ID: "web-main",
  backend: { allowed_peer_ips: ["127.0.0.1", "::1", "10.0.0.0/24"] },
  cache: { directory: "./var/public-snapshots" },
};
test("node console follows the published frontend URL instead of a stale local origin", () => {
  const legacy = { enabled: true, origin: "http://127.0.0.1:3000" };
  assert.equal(
    parseConfiguration({
      ...base,
      PUBLIC_SITE_URL: "https://blog.example.test",
      nodes_monitor: legacy,
    }).nodesMonitor.origin,
    "https://blog.example.test",
  );
  assert.equal(
    parseConfiguration(
      {
        ...base,
        PUBLIC_SITE_URL: "https://blog.example.test",
        nodes_monitor: legacy,
      },
      { PUBLIC_SITE_URL: "https://new.example.test" },
    ).nodesMonitor.origin,
    "https://new.example.test",
  );
  assert.equal(
    parseConfiguration({ ...base, nodes_monitor: legacy }).nodesMonitor.origin,
    legacy.origin,
  );
  assert.equal(
    parseConfiguration({
      ...base,
      PUBLIC_SITE_URL: "https://blog.example.test",
      nodes_monitor: { enabled: false },
    }).nodesMonitor.enabled,
    false,
  );
  assert.throws(
    () => parseConfiguration({ ...base, nodes_monitor: { enabled: true } }),
    /PUBLIC_SITE_URL/,
  );
  const internalSite = { ...base, PUBLIC_SITE_URL: "http://192.0.2.10:3000" };
  assert.equal(parseConfiguration(internalSite).nodesMonitor.enabled, false);
  assert.throws(
    () =>
      parseConfiguration({ ...internalSite, nodes_monitor: { enabled: true } }),
    /HTTPS/,
  );
});
test("container subnets supplement manual peer grants only for the current runtime", () => {
  const environment = {
    EVERUNFOLD_INTERNAL_PEER_CIDRS: "172.25.0.0/16,fd00::/64,172.25.0.0/16,",
  };
  assert.deepEqual(
    parseConfiguration(base, environment).backend.allowedPeerIps,
    ["127.0.0.1", "::1", "10.0.0.0/24", "172.25.0.0/16", "fd00::/64"],
  );
  assert.deepEqual(
    parseConfiguration(base).backend.allowedPeerIps,
    base.backend.allowed_peer_ips,
  );
  for (const invalid of ["0.0.0.0/0", "::/0", "not-an-ip"])
    assert.throws(() =>
      parseConfiguration(base, { EVERUNFOLD_INTERNAL_PEER_CIDRS: invalid }),
    );
});
test("one frontend listener ignores legacy receiver ports and validates its environment", () => {
  const input = {
    ...base,
    settings: { receiver_host: "127.0.0.1", receiver_port: 3010 },
  };
  const config = parseConfiguration(input, {
    FRONTEND_HOST: "0.0.0.0",
    FRONTEND_PORT: "3100",
    FRONTEND_RECEIVER_PORT: "3001",
  });
  assert.equal(config.listener.host, "0.0.0.0");
  assert.equal(config.listener.port, 3100);
  assert.equal(parseConfiguration(input).listener.port, 3000);
  for (const port of ["", "3e3", "65536"]) {
    assert.throws(() => parseConfiguration(input, { FRONTEND_PORT: port }));
  }
});
test("published URLs, backend connection and listeners stay separate", () => {
  const config = parseConfiguration(
    {
      ...base,
      backend: { ...base.backend, base_url: "http://backend.internal:8000" },
    },
    {
      BACKEND_BASE_URL: "https://api.example.com",
      PUBLIC_SITE_URL: "https://blog.example.com",
      FRONTEND_HOST: "0.0.0.0",
      FRONTEND_PORT: "3000",
      FRONTEND_RECEIVER_HOST: "127.0.0.2",
      FRONTEND_RECEIVER_PORT: "3001",
    },
  );
  assert.equal(config.backendBaseUrl, "https://api.example.com");
  assert.equal(config.backend.baseUrl, "http://backend.internal:8000");
  assert.equal(config.publicSiteUrl, "https://blog.example.com");
  assert.equal(config.listener.host, "0.0.0.0");
  assert.equal(config.listener.port, 3000);
  assert.equal(
    browserBackendBaseUrl(config, "127.0.0.1:13000", "http:"),
    "https://api.example.com",
  );
});
test("the configured loopback origin alone uses the same-origin API", () => {
  const config = parseConfiguration({
    ...base,
    BACKEND_BASE_URL: "https://api.example.com",
    browser_loopback_origin: "http://127.0.0.1:3000/",
  });
  assert.equal(
    browserBackendBaseUrl(config, "127.0.0.1:3000", "http:"),
    "http://127.0.0.1:3000",
  );
  for (const [host, protocol] of [
    ["blog.example.com", "https:"],
    ["localhost:3000", "http:"],
    ["127.0.0.1:3100", "http:"],
    ["127.0.0.1:3000", "https:"],
  ]) {
    assert.equal(
      browserBackendBaseUrl(config, host, protocol),
      config.backendBaseUrl,
    );
  }
  assert.equal(config.backend.baseUrl, "https://api.example.com");
  assert.throws(
    () =>
      parseConfiguration({
        ...base,
        browser_loopback_origin: "https://example.com",
      }),
    /回环根地址/,
  );
});
test("unknown fields, empty overrides, bad addresses and CIDRs fail clearly", () => {
  assert.equal(parseConfiguration(base).publicSiteUrl, undefined);
  assert.equal(
    parseConfiguration({
      ...base,
      PUBLIC_SITE_URL: "https://blog.example.com/",
    }).publicSiteUrl,
    "https://blog.example.com",
  );
  assert.throws(() =>
    parseConfiguration({
      ...base,
      PUBLIC_SITE_URL: "https://example.com/subpath",
    }),
  );
  assert.throws(() =>
    parseConfiguration({
      ...base,
      PUBLIC_SITE_URL: "https://secret:password@example.com",
    }),
  );
  assert.throws(() => parseConfiguration({ ...base, typo: true }));
  assert.throws(() => parseConfiguration(base, { BACKEND_BASE_URL: "" }));
  assert.throws(() =>
    parseConfiguration({
      ...base,
      BACKEND_BASE_URL: "https://secret:password@example.com/v1",
    }),
  );
  assert.throws(() =>
    parseConfiguration({
      ...base,
      backend: { allowed_peer_ips: ["10.0.0.1/33"] },
    }),
  );
  assert.throws(() =>
    parseConfiguration({ ...base, cache: { max_snapshot_bytes: -1 } }),
  );
});
