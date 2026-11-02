import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";
import {
  applyFields,
  blockText,
  createScratch,
  LOCAL,
  projectDocument,
  REMOTE,
  replaceText,
  removedBlocks,
} from "../src/core/collaboration/document";
import { createBlockEditorRegistry } from "../src/core/editor/registry";
import type { DraftFields } from "../src/generated/content-admin-contract";
import { readServerFrame } from "../src/core/collaboration/wire";
import { serializeDraftExport } from "../src/core/collaboration/export";
import {
  rememberRecovery,
  recoveryForPage,
  recoverySnapshot,
  clearRecovery,
  subscribeRecovery,
  noServerRecovery,
} from "../src/core/collaboration/recovery";
import {
  mergeLocalDocuments,
  type LocalDocument,
} from "../src/core/collaboration/local-store";

function fields(): DraftFields {
  return {
    title: "标题🌟",
    excerpt: "",
    settings: {},
    body: [
      { id: crypto.randomUUID(), type: "markdown", content: "你好" },
      { id: crypto.randomUUID(), type: "html", content: "<p>HTML</p>" },
    ],
  };
}
function clone(doc: Y.Doc) {
  const other = new Y.Doc();
  Y.applyUpdate(other, Y.encodeStateAsUpdate(doc), REMOTE);
  return other;
}

test("atomic local storage merges offline tabs and ACK tombstones prevent stale outboxes from returning", () => {
  const start = fields(),
    a = createScratch(start),
    b = clone(a),
    epoch = crypto.randomUUID();
  const makeUpdate = (doc: Y.Doc, id: string, value: string) => {
    const vector = Y.encodeStateVector(doc);
    blockText(doc, id).insert(0, value);
    return {
      type: "update" as const,
      epoch,
      update_id: crypto.randomUUID(),
      payload: Buffer.from(Y.encodeStateAsUpdate(doc, vector)).toString(
        "base64",
      ),
    };
  };
  const one = makeUpdate(a, start.body[0].id, "窗口A"),
    two = makeUpdate(b, start.body[1].id, "窗口B");
  const first: LocalDocument = {
    epoch,
    state: Y.encodeStateAsUpdate(a),
    pending: [one],
  };
  const second: LocalDocument = {
    epoch,
    state: Y.encodeStateAsUpdate(b),
    pending: [two],
  };
  const canonical = mergeLocalDocuments(first, second);
  const restored = new Y.Doc();
  Y.applyUpdate(restored, canonical.state);
  assert.match(blockText(restored, start.body[0].id).toString(), /窗口A/);
  assert.match(blockText(restored, start.body[1].id).toString(), /窗口B/);
  assert.equal(canonical.pending.length, 2);
  const acked = mergeLocalDocuments(canonical, {
    ...first,
    pending: [],
    acknowledged: { [one.update_id]: 5 },
  });
  const staleWriter = mergeLocalDocuments(acked, first);
  assert.deepEqual(
    staleWriter.pending.map((item) => item.update_id),
    [two.update_id],
  );
  assert.throws(() =>
    mergeLocalDocuments(canonical, { ...second, epoch: crypto.randomUUID() }),
  );
  a.destroy();
  b.destroy();
  restored.destroy();
});

test("revoked-session recovery exports only previously loaded data for that page/account, with no password or SSR content", () => {
  const draft = fields();
  draft.access_password = "must-not-export";
  let changes = 0;
  const unsubscribe = subscribeRecovery(() => changes++);
  rememberRecovery("owner", "/admin/editor", "draft", draft);
  const value = recoverySnapshot();
  assert.ok(value && !value.content.includes("must-not-export"));
  assert.equal(recoveryForPage(value, "/admin/editor", "owner"), value);
  assert.equal(recoveryForPage(value, "/other", "owner"), null);
  assert.equal(recoveryForPage(value, "/admin/editor", "other-account"), null);
  assert.equal(recoveryForPage(value, "/admin/editor", undefined), null);
  assert.equal(noServerRecovery(), null);
  rememberRecovery("owner", "/admin/editor", "draft", draft);
  assert.equal(changes, 1);
  clearRecovery();
  unsubscribe();
  assert.equal(recoverySnapshot(), null);
});

test("mixed plugins share one Y.Doc; concurrent Chinese/emoji inserts converge", () => {
  const start = fields(),
    a = createScratch(start),
    b = clone(a);
  a.transact(() => blockText(a, start.body[0].id).insert(2, "甲👨‍👩‍👧"), LOCAL);
  b.transact(() => blockText(b, start.body[0].id).insert(2, "乙🌟"), LOCAL);
  b.transact(
    () => blockText(b, start.body[1].id).insert(3, "另一个区块"),
    LOCAL,
  );
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b), REMOTE);
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a), REMOTE);
  assert.deepEqual(projectDocument(a, start), projectDocument(b, start));
  assert.match(blockText(a, start.body[0].id).toString(), /甲👨‍👩‍👧/);
  assert.match(blockText(a, start.body[0].id).toString(), /乙🌟/);
  a.destroy();
  b.destroy();
});

test("a stale settings event preserves concurrent text and newly inserted neighbors", () => {
  const start = fields(),
    a = createScratch(start),
    b = clone(a);
  const fresh = {
    id: crypto.randomUUID(),
    type: "markdown" as const,
    content: "远端新块",
  };
  applyFields(b, { ...start, body: [...start.body, fresh] }, start);
  blockText(b, start.body[0].id).insert(2, "远端输入");
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b), REMOTE);
  applyFields(
    a,
    { ...start, settings: { pinned: true }, body: [...start.body].reverse() },
    start,
  );
  const result = projectDocument(a, start);
  assert.ok(result.body.some((block) => block.id === fresh.id));
  assert.match(
    result.body.find((block) => block.id === start.body[0].id)!.content,
    /远端输入/,
  );
  assert.equal(result.settings?.pinned, true);
  a.destroy();
  b.destroy();
});

test("tombstones prevent offline text edits from resurrecting a removed block; local undo preserves other people's edits", () => {
  const start = fields(),
    a = createScratch(start),
    b = clone(a);
  const undo = new Y.UndoManager(
    [a.getMap("blocks"), a.getArray("order"), a.getMap("meta")],
    { trackedOrigins: new Set([LOCAL]) },
  );
  applyFields(a, { ...start, body: [start.body[1]] }, start);
  b.transact(() => blockText(b, start.body[0].id).insert(2, "离线补充"), LOCAL);
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b), REMOTE);
  assert.equal(projectDocument(a, start).body.length, 1);
  const visible = projectDocument(a, start);
  const exported = JSON.parse(
    serializeDraftExport(visible, removedBlocks(a, visible)),
  );
  assert.match(exported.removed_blocks[0].content, /离线补充/);
  undo.undo();
  const restored = projectDocument(a, start);
  assert.equal(restored.body.length, 2);
  assert.match(
    restored.body.find((part) => part.id === start.body[0].id)!.content,
    /离线补充/,
  );
  undo.destroy();
  a.destroy();
  b.destroy();
});

test("minimal UTF-16 splices preserve emoji and private access fields never enter CRDT", () => {
  const start = fields();
  start.access_password = "private-test-only";
  start.settings = { visibility: "password", opens_at: "2099-01-01T00:00:00Z" };
  const doc = createScratch(start);
  const text = blockText(doc, start.body[0].id);
  for (const value of ["🌟👨‍👩‍👧", "🌟a👨‍👩‍👧", "☀️👨‍👩‍👧", ""]) {
    replaceText(text, value);
    assert.equal(text.toString(), value);
  }
  const serialized = JSON.stringify(doc.toJSON());
  assert.ok(
    !serialized.includes("private-test-only") &&
      !serialized.includes("visibility") &&
      !serialized.includes("2099"),
  );
  doc.destroy();
});

test("the registry rejects duplicate adapters; backend socket contract rejects malformed frames", () => {
  const plugin = {
    id: "core.markdown",
    version: "1.0.0",
    format: "markdown" as const,
    label: "Markdown",
    adapter: () => null,
  };
  assert.throws(() => createBlockEditorRegistry([plugin, { ...plugin }]));
  assert.equal(createBlockEditorRegistry([plugin]).get("html"), undefined);
  assert.equal(
    readServerFrame(
      JSON.stringify({
        type: "ack",
        update_id: crypto.randomUUID(),
        committed_seq: 3,
      }),
    ).type,
    "ack",
  );
  assert.throws(() =>
    readServerFrame('{"type":"ack","committed_seq":"wrong"}'),
  );
  assert.throws(() => readServerFrame('{"type":"unknown"}'));
});
