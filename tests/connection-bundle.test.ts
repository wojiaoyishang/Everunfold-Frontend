import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { decodeConnectionBundle } from "../src/core/nodes/connection-bundle";

const bundle = {
  format: "everunfold-node-connection/v1",
  node_id: "web-main",
  backend_public_url: "https://api.example.test",
  source_epoch: "12345678-1234-4234-8234-123456789abc",
  tokens: {
    inbound: { name: "NODE_IN", value: "i".repeat(43) },
    outbound: { name: "NODE_OUT", value: "o".repeat(43) },
  },
};
const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64");

test("the browser decodes the Python export without exposing unrelated config or changing internal addresses", () => {
  const encoded = execFileSync(
    "python3",
    [
      "-c",
      'import json,sys; sys.path.insert(0,"deploy"); from connection_bundle import encode_bundle; print(encode_bundle(json.load(sys.stdin)))',
    ],
    {
      cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
      input: JSON.stringify(bundle),
      encoding: "utf8",
    },
  ).trim();
  assert.equal(encoded, encode(bundle));
  assert.deepEqual(
    decodeConnectionBundle(encoded.slice(0, 40) + "\n" + encoded.slice(40)),
    {
      nodeId: "web-main",
      publicUrl: "https://api.example.test",
      sourceEpoch: bundle.source_epoch,
      inboundToken: bundle.tokens.inbound.value,
      outboundToken: bundle.tokens.outbound.value,
    },
  );
});

test("invalid or oversized Base64 and credential bundles fail with a fixed message, without reflecting input", () => {
  const inputs = [
    "",
    "not-base64-secret",
    "A".repeat(90000),
    encode(bundle) + "=",
    Buffer.from([0xff, 0xfe]).toString("base64"),
    encode({ ...bundle, format: "unexpected-version" }),
    encode({ ...bundle, source_epoch: "not-a-uuid" }),
    encode({
      ...bundle,
      tokens: { ...bundle.tokens, outbound: bundle.tokens.inbound },
    }),
    ...[
      "http://remote.example.test",
      "https://user:secret@example.test",
      "https://api.example.test/path",
      "https://0.0.0.0",
      "https://[::]",
      "https://api.example.test?token=secret",
    ].map((url) => encode({ ...bundle, backend_public_url: url })),
  ];
  for (const value of inputs)
    assert.throws(() => decodeConnectionBundle(value), {
      message: "连接编码无效，请粘贴后端导出的完整 Base64。",
    });
});
