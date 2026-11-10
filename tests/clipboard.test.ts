import assert from "node:assert/strict";
import test from "node:test";
import { copyTextWithFallback } from "../src/core/browser/clipboard";

test("copy uses the modern API without invoking the fallback", async () => {
  const calls: string[] = [];
  const result = await copyTextWithFallback(
    "const answer = 42;",
    async (text) => {
      calls.push(`modern:${text}`);
    },
    (text) => {
      calls.push(`legacy:${text}`);
      return true;
    },
  );
  assert.equal(result, "clipboard");
  assert.deepEqual(calls, ["modern:const answer = 42;"]);
});

test("copy falls back to selection after modern API rejection", async () => {
  const calls: string[] = [];
  const result = await copyTextWithFallback(
    "line one\r\n\tline two\n",
    async () => {
      calls.push("modern");
      throw new DOMException("denied", "NotAllowedError");
    },
    (text) => {
      calls.push(`legacy:${text}`);
      return true;
    },
  );
  assert.equal(result, "fallback");
  assert.deepEqual(calls, ["modern", "legacy:line one\r\n\tline two\n"]);
});

test("copy reports failure only after both mechanisms fail", async () => {
  const calls: string[] = [];
  await assert.rejects(
    copyTextWithFallback(
      "const answer = 42;",
      async () => {
        calls.push("modern");
        throw new Error("clipboard unavailable");
      },
      () => {
        calls.push("legacy");
        return false;
      },
    ),
    /clipboard unavailable/,
  );
  assert.deepEqual(calls, ["modern", "legacy"]);
});

test("copy falls back when the modern API is absent", async () => {
  let legacyCalls = 0;
  const result = await copyTextWithFallback("text", undefined, () => {
    legacyCalls += 1;
    return true;
  });
  assert.equal(result, "fallback");
  assert.equal(legacyCalls, 1);
});
