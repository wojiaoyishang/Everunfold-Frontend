import assert from "node:assert/strict";
import test from "node:test";
import { parseConfiguration } from "../src/core/config/schema";

const base = {
  BACKEND_BASE_URL: "http://127.0.0.1:8000",
  FRONTEND_NODE_ID: "web-main",
  backend: { allowed_peer_ips: ["127.0.0.1", "::1", "10.0.0.0/24"] },
  cache: { directory: "./var/public-snapshots" },
};
test("configuration uses an explicit public address while internal overrides stay separate", () => {
  const config = parseConfiguration(
    {
      ...base,
      backend: { ...base.backend, base_url: "http://backend.internal:8000" },
    },
    { BACKEND_BASE_URL: "https://api.example.com" },
  );
  assert.equal(config.backendBaseUrl, "https://api.example.com");
  assert.equal(config.backend.baseUrl, "http://backend.internal:8000");
});
test("unknown fields, empty overrides, bad addresses and CIDRs fail clearly", () => {
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
