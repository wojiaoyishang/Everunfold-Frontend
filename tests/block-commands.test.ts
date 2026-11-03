import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";
import { commandBody } from "../src/core/editor/block-commands";
import { commandDocument } from "../src/core/collaboration/block-commands";
import {
  blockText,
  createScratch,
  LOCAL,
  projectDocument,
  REMOTE,
} from "../src/core/collaboration/document";
import type { DraftFields } from "../src/generated/content-admin-contract";

function setup(): DraftFields {
  return {
    title: "结构试验",
    settings: {},
    body: ["A", "B", "C", "D"].map((content) => ({
      id: crypto.randomUUID(),
      type: "markdown",
      content,
    })),
  };
}
test("anchored insert/move uses current neighbors and rejects removed targets and no-ops", () => {
  const fields = setup(),
    [a, b, c, d] = fields.body;
  const next = commandBody(fields.body, {
    kind: "move",
    id: d.id,
    before: b.id,
  })!;
  assert.deepEqual(
    next.map((b) => b.content),
    ["A", "D", "B", "C"],
  );
  assert.equal(next[1], d);
  assert.equal(
    commandBody(next, { kind: "move", id: d.id, before: b.id }),
    null,
  );
  assert.equal(
    commandBody(next, { kind: "insert", block: a, before: b.id }),
    null,
  );
  assert.equal(
    commandBody(next, { kind: "move", id: a.id, before: crypto.randomUUID() }),
    null,
  );
  assert.equal(
    commandBody(
      next.filter((b) => b.id !== c.id),
      { kind: "move", id: c.id, before: null },
    ),
    null,
  );
});
test("one move is one undo item, retains Y.Text, and preserves peer edits and inserted blocks", () => {
  const fields = setup(),
    doc = createScratch(fields),
    peer = new Y.Doc();
  Y.applyUpdate(peer, Y.encodeStateAsUpdate(doc), REMOTE);
  const [a, b, , d] = fields.body,
    text = blockText(doc, d.id);
  const undo = new Y.UndoManager(
    [doc.getMap("blocks"), doc.getArray("order")],
    { trackedOrigins: new Set([LOCAL]) },
  );
  const extra = {
    id: crypto.randomUUID(),
    type: "html" as const,
    content: "<p>远端</p>",
  };
  commandDocument(peer, fields, { kind: "insert", block: extra, before: b.id });
  blockText(peer, d.id).insert(0, "协作");
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(peer), REMOTE);
  assert.equal(
    commandDocument(doc, fields, { kind: "move", id: d.id, before: a.id }),
    true,
  );
  assert.equal(undo.undoStack.length, 1);
  assert.equal(blockText(doc, d.id), text);
  assert.deepEqual(
    projectDocument(doc, fields).body.map((b) => b.id),
    [d.id, a.id, extra.id, b.id, fields.body[2].id],
  );
  undo.undo();
  assert.deepEqual(
    projectDocument(doc, fields).body.map((b) => b.id),
    [a.id, extra.id, b.id, fields.body[2].id, d.id],
  );
  assert.equal(text.toString(), "协作D");
  undo.redo();
  assert.equal(projectDocument(doc, fields).body[0].id, d.id);
  doc.destroy();
  peer.destroy();
});
test("cancelled stale drag emits no update and concurrent moves converge without duplicate visible blocks", () => {
  const fields = setup(),
    doc = createScratch(fields),
    peer = new Y.Doc();
  Y.applyUpdate(peer, Y.encodeStateAsUpdate(doc), REMOTE);
  let updates = 0;
  doc.on("update", () => updates++);
  assert.equal(
    commandDocument(doc, fields, {
      kind: "move",
      id: fields.body[0].id,
      before: "deleted",
    }),
    false,
  );
  assert.equal(updates, 0);
  commandDocument(doc, fields, {
    kind: "move",
    id: fields.body[3].id,
    before: fields.body[0].id,
  });
  commandDocument(peer, fields, {
    kind: "move",
    id: fields.body[3].id,
    before: fields.body[1].id,
  });
  const one = Y.encodeStateAsUpdate(doc),
    two = Y.encodeStateAsUpdate(peer);
  Y.applyUpdate(doc, two, REMOTE);
  Y.applyUpdate(peer, one, REMOTE);
  assert.deepEqual(projectDocument(doc, fields), projectDocument(peer, fields));
  assert.equal(
    new Set(projectDocument(doc, fields).body.map((b) => b.id)).size,
    4,
  );
  doc.destroy();
  peer.destroy();
});
