import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { randomUUID, sha256Hex } from "../src/core/browser/crypto";

test("HTTP without secure-context crypto APIs keeps random IDs and exact SHA-256 fingerprints", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const native = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { getRandomValues: native.getRandomValues.bind(native) },
  });
  try {
    const ids = Array.from({ length: 32 }, () => randomUUID());
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids)
      assert.match(
        id,
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
      );
    for (const source of ["", "abc", "x".repeat(65), "中文🌟\r\n".repeat(200)])
      assert.equal(
        await sha256Hex(source),
        createHash("sha256").update(source).digest("hex"),
      );
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
  }
});

test("native browser crypto remains supported with the same fingerprint format", async () => {
  assert.equal(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  assert.match(randomUUID(), /^[a-f0-9-]{36}$/);
});
