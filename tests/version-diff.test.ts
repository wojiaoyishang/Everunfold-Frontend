import assert from "node:assert/strict";
import test from "node:test";
import {
  compareBlocks,
  highlightRenderedDiff,
  textDiff,
} from "../src/core/editor/version-diff";
import { swapRevisionPair } from "../src/core/content-management/revision-pair";

test("swapping reads the latest live-head address and preserves both sides across refresh", () => {
  const address = new URLSearchParams("view=version&selected=1&compare=2");
  // A picker has already changed native history, before the previous render's handler updates.
  address.set("compare", "head");
  const swapped = swapRevisionPair(address);
  assert.equal(swapped.get("selected"), "head");
  assert.equal(swapped.get("compare"), "1");
  assert.equal(swapRevisionPair(swapped).toString(), address.toString());
  assert.equal(address.get("selected"), "1");
});

const block = (id: string, content = id) => ({
  id,
  type: "markdown" as const,
  content,
});
test("block comparison distinguishes insertions, removals, movement and source edits", () => {
  const before = [block("a"), block("b"), block("c")];
  const inserted = compareBlocks(before, [block("new"), ...before]);
  assert.deepEqual(
    inserted.map((b) => b.changed),
    [true, false, false, false],
  );
  const moved = compareBlocks(before, [
    block("c"),
    block("a"),
    block("b", "修改"),
  ]);
  assert.equal(moved.filter((b) => b.moved).length, 1);
  assert.equal(moved.find((b) => b.id === "b")?.changed, true);
  const removed = compareBlocks(before, [block("a"), block("c")]);
  assert.deepEqual(
    removed.map((b) => b.id),
    ["a", "b", "c"],
  );
  assert.equal(removed[1].after, undefined);
  assert.equal(removed[2].moved, false);
});

test("rendered changes stay escaped and leave source, formatting, code and formulas intact", () => {
  const before =
    '<p>你好 <strong>旧文字</strong> &amp; 世界</p><code>old</code><span data-math="inline">x+1</span>';
  const after =
    '<p>你好 <strong>新文字</strong> &amp; &lt;script&gt;</p><code>new</code><span data-math="inline">x+2</span>';
  const [left, right] = highlightRenderedDiff(before, after);
  assert.match(left, /data-version-change="removed"/);
  assert.match(right, /data-version-change="added"/);
  assert.match(right, /<strong>.*新.*<\/strong>/);
  assert.match(right, /&lt;script&gt;/);
  assert.doesNotMatch(right, /<script>/);
  assert.match(right, /<code>new<\/code>/);
  assert.match(right, /data-math="inline">x\+2<\/span>/);
  assert.equal(highlightRenderedDiff(after, after)[1], after);
});

test("text diff offsets refer to original CRLF and emoji source", () => {
  const before = "甲🌟\r\n旧文\r\n末尾",
    after = "甲🌟\r\n新文👨‍👩‍👧\r\n末尾";
  const changes = textDiff(before, after);
  let result = before;
  for (const change of [...changes].reverse())
    result =
      result.slice(0, change.fromA) +
      after.slice(change.fromB, change.toB) +
      result.slice(change.toA);
  assert.equal(result, after);
});

test("appending HTML paragraphs leaves identical siblings and whitespace unmarked", () => {
  const unchanged = "<p><strong>保留的文字</strong>，保持原有格式。</p>";
  const before = `<h2>提示卡片</h2>\n<p>旧版本使用简短的说明文字。</p>\n${unchanged}\n`;
  const after = `<h2>提示卡片</h2>\n<p>新版本加入更清楚的说明文字。</p>\n${unchanged}\n<p>新增强调内容。</p>\n`;
  const [left, right] = highlightRenderedDiff(before, after);
  assert.ok(left.includes(unchanged));
  assert.ok(right.includes(unchanged));
  assert.match(left, /data-version-change="removed"/);
  assert.match(right, /data-version-change="added"/);
  assert.doesNotMatch(left + right, /<mark[^>]+>\s*<\/mark>/);
});
