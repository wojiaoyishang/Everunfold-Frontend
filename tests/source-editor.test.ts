import assert from "node:assert/strict";
import test from "node:test";
import { EditorState } from "@codemirror/state";
import {
  sourceCommand,
  type SourceCommand,
} from "../src/core/editor/source-commands";

function apply(doc: string, from: number, to: number, command: SourceCommand) {
  const state = EditorState.create({
    doc,
    selection: { anchor: from, head: to },
  });
  return state.update(sourceCommand(state, command)).state;
}
const bold: SourceCommand = {
  kind: "wrap",
  before: "**",
  after: "**",
  placeholder: "文字",
};
const tab: SourceCommand = { kind: "tab" };

test("source tab inserts a literal tab at the cursor instead of the line start", () => {
  const doc = '  "count": 1';
  const cursor = doc.indexOf("1");
  const state = apply(doc, cursor, cursor, tab);
  assert.equal(state.doc.toString(), '  "count": \t1');
  assert.equal(state.selection.main.anchor, cursor + 1);
  assert.ok(state.selection.main.empty);
});

test("source tab prefixes an entire selection once and preserves its direction", () => {
  const doc = '  "count": 1,\n  "total": 2';
  const start = doc.indexOf("1");
  for (const [anchor, head] of [
    [start, doc.length],
    [doc.length, start],
  ]) {
    const state = apply(doc, anchor, head, tab);
    assert.equal(state.doc.toString(), '  "count": \t1,\n  "total": 2');
    assert.equal(state.selection.main.anchor, anchor + 1);
    assert.equal(state.selection.main.head, head + 1);
  }
});

test("source inline formatting toggles without losing the Chinese or emoji selection", () => {
  let state = apply("你好🌟", 0, 4, bold);
  assert.equal(state.doc.toString(), "**你好🌟**");
  assert.equal(
    state.sliceDoc(state.selection.main.from, state.selection.main.to),
    "你好🌟",
  );
  state = state.update(sourceCommand(state, bold)).state;
  assert.equal(state.doc.toString(), "你好🌟");
  assert.equal(apply("**hello**", 0, 9, bold).doc.toString(), "hello");
  assert.equal(apply("", 0, 0, bold).doc.toString(), "**文字**");
});
test("italic does not remove a bold marker, and HTML code remains literal", () => {
  const italic: SourceCommand = { kind: "wrap", before: "*", after: "*" };
  assert.equal(apply("**hello**", 2, 7, italic).doc.toString(), "***hello***");
  assert.equal(apply("**hello**", 0, 9, italic).doc.toString(), "***hello***");
  assert.equal(apply("***hello***", 3, 8, italic).doc.toString(), "**hello**");
  assert.equal(
    apply("<p>&</p>", 0, 8, {
      kind: "wrap",
      before: "<pre><code>",
      after: "</code></pre>",
      escapeHtml: true,
      block: true,
    }).doc.toString(),
    "<pre><code>&lt;p&gt;&amp;&lt;/p&gt;</code></pre>",
  );
});
test("list commands preserve indentation, convert list styles and exclude a trailing next-line boundary", () => {
  let state = apply("甲\n  乙\n丙", 0, 7, { kind: "lines", style: "ordered" });
  assert.equal(state.doc.toString(), "1. 甲\n  2. 乙\n3. 丙");
  state = state.update(
    sourceCommand(state, { kind: "lines", style: "ordered" }),
  ).state;
  assert.equal(state.doc.toString(), "甲\n  乙\n丙");
  assert.equal(
    apply("- 甲\n- 乙", 0, 7, { kind: "lines", style: "task" }).doc.toString(),
    "- [ ] 甲\n- [ ] 乙",
  );
  assert.equal(
    apply("甲\n乙", 0, 2, { kind: "lines", style: "quote" }).doc.toString(),
    "> 甲\n乙",
  );
});
test("headings replace existing markers or HTML tags instead of stacking them", () => {
  assert.equal(
    apply("## 标题", 4, 4, {
      kind: "heading",
      level: 3,
      format: "markdown",
    }).doc.toString(),
    "### 标题",
  );
  assert.equal(
    apply("## 标题", 4, 4, {
      kind: "heading",
      level: 0,
      format: "markdown",
    }).doc.toString(),
    "标题",
  );
  assert.equal(
    apply("<h2>标题</h2>", 5, 5, {
      kind: "heading",
      level: 3,
      format: "html",
    }).doc.toString(),
    "<h3>标题</h3>",
  );
  assert.equal(
    apply("", 0, 0, {
      kind: "heading",
      level: 0,
      format: "html",
    }).doc.toString(),
    "<p></p>",
  );
  assert.equal(
    apply("", 0, 0, { kind: "heading", level: 0, format: "html" }).selection
      .main.head,
    3,
  );
  assert.equal(
    apply('<p class="lead">标题</p>', 18, 18, {
      kind: "heading",
      level: 2,
      format: "html",
    }).doc.toString(),
    '<h2 class="lead">标题</h2>',
  );
});
test("block snippets avoid joining existing prose and keep placeholder selected", () => {
  const state = apply("左右", 1, 1, {
    kind: "wrap",
    before: "```\n",
    after: "\n```",
    placeholder: "代码",
    block: true,
  });
  assert.equal(state.doc.toString(), "左\n\n```\n代码\n```\n\n右");
  assert.equal(
    state.sliceDoc(state.selection.main.from, state.selection.main.to),
    "代码",
  );
});
