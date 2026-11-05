import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import type { EditorView, ViewUpdate } from "@codemirror/view";
import { Awareness } from "y-protocols/awareness";
import { CollaborativeSourceBinding } from "../src/core/collaboration/codemirror-binding";
import {
  DraftSession,
  type browserDraftStorage,
} from "../src/core/collaboration/session";
import {
  blockText,
  createScratch,
  fromBase64,
  REMOTE,
  toBase64,
} from "../src/core/collaboration/document";
import type { SharedSource } from "../src/core/collaboration/editor-binding";
import type { LocalBranch } from "../src/core/collaboration/branches";
import { privateDraftFields } from "../src/core/collaboration/branches";
import type { DraftFields } from "../src/generated/content-admin-contract";
import type { ServerFrame } from "../src/generated/collaboration-contract";
import { normalizeSourceLines } from "../src/core/editor/source-lines";
import { readServerFrame } from "../src/core/collaboration/wire";
import { pageIdentity } from "../src/core/collaboration/page-identity";

function fields(content = "甲🌟\r\n乙\r\n丙"): DraftFields {
  return {
    title: "协同测试",
    body: [{ id: crypto.randomUUID(), type: "markdown", content }],
    settings: {},
  };
}

test("refresh retains an outbox identity while a copied tab isolates it", () => {
  const old = JSON.stringify({ id: "original", timeOrigin: 100 });
  assert.equal(pageIdentity(old, 100, "navigate", "new").id, "original");
  assert.equal(pageIdentity(old, 200, "reload", "new").id, "original");
  assert.equal(pageIdentity(old, 200, "navigate", "new").id, "new");
  assert.equal(pageIdentity(old, 200, "back_forward", "new").id, "new");
});
class SourceView {
  state: EditorState;
  hasFocus = true;
  binding!: CollaborativeSourceBinding;
  constructor(source: string) {
    this.state = EditorState.create({ doc: normalizeSourceLines(source) });
  }
  dispatch(spec: TransactionSpec) {
    const transaction = this.state.update(spec);
    this.state = transaction.state;
    this.binding.update({
      state: this.state,
      view: this,
      transactions: [transaction],
      changes: transaction.changes,
      docChanged: transaction.docChanged,
      selectionSet: Boolean(spec.selection),
      focusChanged: false,
    } as unknown as ViewUpdate);
  }
}
function binding(doc: Y.Doc, id: string) {
  const text = blockText(doc, id),
    awareness = new Awareness(doc),
    undo = new Y.UndoManager(doc.getMap("blocks"));
  const raw = { current: text.toString() };
  const shared: SharedSource = {
    text,
    awareness,
    undo,
    blockId: id,
    host: {
      setPresence(blockId: string, range: { start: number; end: number }) {
        awareness.setLocalState({
          blockId,
          cursor: {
            anchor: Y.createRelativePositionFromTypeIndex(text, range.start),
            head: Y.createRelativePositionFromTypeIndex(text, range.end),
          },
        });
      },
    } as DraftSession,
  };
  const view = new SourceView(text.toString());
  view.binding = new CollaborativeSourceBinding(
    view as unknown as EditorView,
    shared,
    raw,
  );
  return {
    view,
    raw,
    shared,
    close: () => {
      view.binding.destroy();
      awareness.destroy();
      undo.destroy();
      doc.destroy();
    },
  };
}

test("actual source binding preserves CRLF/emoji, concurrent edits and relative selections through own undo", () => {
  const initial = fields(),
    first = createScratch(initial, true),
    second = new Y.Doc();
  Y.applyUpdate(second, Y.encodeStateAsUpdate(first), REMOTE);
  const id = initial.body[0].id,
    a = binding(first, id),
    b = binding(second, id);
  try {
    a.view.dispatch({
      changes: { from: 4, insert: "本人" },
      selection: { anchor: 6 },
    });
    b.view.dispatch({
      changes: { from: 7, insert: "远端👨‍👩‍👧" },
      selection: { anchor: 7 },
    });
    Y.applyUpdate(first, Y.encodeStateAsUpdate(second), REMOTE);
    Y.applyUpdate(second, Y.encodeStateAsUpdate(first), REMOTE);
    assert.equal(a.raw.current, b.raw.current);
    assert.equal(
      a.view.state.doc.toString(),
      normalizeSourceLines(a.raw.current),
    );
    assert.equal(
      b.view.state.doc.toString(),
      normalizeSourceLines(b.raw.current),
    );
    assert.match(a.raw.current, /\r\n/);
    assert.match(a.raw.current, /本人/);
    assert.match(a.raw.current, /远端👨‍👩‍👧/);
    const cursor = a.shared.awareness.getLocalState()?.cursor;
    assert.ok(
      cursor &&
        Y.createAbsolutePositionFromRelativePosition(cursor.head, first),
    );
    a.shared.undo.undo();
    assert.doesNotMatch(a.raw.current, /本人/);
    assert.match(a.raw.current, /远端👨‍👩‍👧/);
  } finally {
    a.close();
    b.close();
  }
});

function memoryStorage() {
  const branches = new Map<string, LocalBranch>();
  const storage: typeof browserDraftStorage = {
    open: async () => ({
      read: async () => undefined,
      write: async () => {},
      clear: async () => {},
      watch: () => {},
      close: () => {},
    }),
    writeBranch: async (value) => {
      branches.set(value.id, structuredClone(value));
    },
    listBranches: async (scope) =>
      [...branches.values()].filter((branch) => branch.scope === scope),
  };
  return { branches, storage };
}
function receive(session: DraftSession, frame: ServerFrame) {
  (session as unknown as { receive: (frame: ServerFrame) => void }).receive(
    readServerFrame(JSON.stringify(frame)),
  );
}

test("legacy unacknowledged outboxes become one durable review branch without replay", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
  const initial = fields("旧设备未确认\r\n🌟"),
    doc = createScratch(initial),
    epoch = crypto.randomUUID();
  const state = Y.encodeStateAsUpdate(doc);
  const update = {
    type: "update" as const,
    update_id: crypto.randomUUID(),
    epoch,
    payload: toBase64(state),
    rich_versions: {},
  };
  const { storage, branches } = memoryStorage();
  const vault = await storage.open("legacy");
  storage.open = async () => ({
    ...vault,
    read: async () => ({ epoch, state, pending: [update] }),
  });
  const session = new DraftSession(
    "http://example.invalid",
    "test",
    crypto.randomUUID(),
    "owner",
    initial,
    storage,
  );
  try {
    const recover = () =>
      (
        session as unknown as { restoreLegacy: () => Promise<void> }
      ).restoreLegacy();
    await recover();
    assert.equal(session.state.mode, "review");
    assert.equal(session.state.pending, 0);
    assert.equal(
      session.project(initial).body[0].content,
      initial.body[0].content,
    );
    assert.equal(
      session.currentBranch?.payload.updates?.[0].update_id,
      update.update_id,
    );
    assert.equal(session.currentBranch?.payload.base_seq, 0);
    await recover();
    await session.prepareNavigation();
    assert.equal(branches.size, 1);
  } finally {
    await session.dispose();
    doc.destroy();
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("merge freeze shelves late IME input, keeps offline branch across a new epoch, and returning to head retains recovery", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
  const original = fields("原文\n"),
    seed = createScratch(original, true),
    epoch = crypto.randomUUID();
  const { branches, storage } = memoryStorage();
  const session = new DraftSession(
    "http://example.invalid",
    "test",
    crypto.randomUUID(),
    "owner",
    original,
    storage,
  );
  try {
    receive(session, {
      type: "sync",
      epoch,
      payload: toBase64(Y.encodeStateAsUpdate(seed)),
      committed_seq: 0,
      revision: 1,
    });
    session.setSource(original.body[0].id, "原文\n正在输入\n", "原文\n");
    assert.equal(session.state.pending, 1);
    receive(session, {
      type: "control",
      epoch,
      committed_seq: 0,
      merge: {
        id: crypto.randomUUID(),
        actor_id: crypto.randomUUID(),
        actor: "另一位编辑者",
        target_seq: 0,
        expires_at: new Date(Date.now() + 60000).toISOString(),
      },
    });
    assert.equal(session.canEdit, false);
    assert.ok(session.currentBranch);
    session.setSource(
      original.body[0].id,
      "原文\n正在输入\n中文组词结束",
      "原文\n正在输入\n",
    );
    assert.match(
      session.currentBranch!.payload.fields.body[0].content,
      /中文组词结束/,
    );
    assert.equal(session.currentBranch!.payload.base_seq, 0);
    const updates = session.currentBranch!.payload.updates!;
    assert.ok(updates.length > 0);
    const pending = new Y.Doc();
    Y.applyUpdate(pending, fromBase64(updates[0].payload));
    pending.destroy();
    session.continueLocal();
    assert.equal(session.canEdit, true);
    session.setSource(
      original.body[0].id,
      "原文\n正在输入\n中文组词结束\n离线补充",
      "原文\n正在输入\n中文组词结束",
    );
    const newer = createScratch(
      {
        ...original,
        body: [{ ...original.body[0], content: "服务器合并后的正文" }],
      },
      true,
    );
    receive(session, {
      type: "reset",
      epoch: crypto.randomUUID(),
      payload: toBase64(Y.encodeStateAsUpdate(newer)),
      committed_seq: 2,
      revision: 2,
    });
    assert.match(session.project(original).body[0].content, /离线补充/);
    assert.equal(session.currentBranch!.payload.base_epoch, epoch);
    const payload = await session.branchForMerge();
    assert.equal(
      payload.fields.body[0].content,
      "原文\n正在输入\n中文组词结束\n离线补充",
    );
    assert.equal(
      branches.get(payload.branch_id)?.payload.fields.body[0].content,
      payload.fields.body[0].content,
    );
    session.returnToLatest();
    assert.equal(
      session.project(original).body[0].content,
      "服务器合并后的正文",
    );
    assert.equal(session.canEdit, true);
    assert.ok(branches.has(payload.branch_id));
    newer.destroy();
  } finally {
    await session.dispose();
    seed.destroy();
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("local branch fields exclude password/access timing while preserving source exactly", () => {
  const original = fields("<p>  保留 &amp; 🌟 </p>\r\n");
  original.access_password = "private-password";
  original.settings = {
    visibility: "password",
    opens_at: "2099-01-01T00:00:00Z",
  };
  const saved = privateDraftFields(original);
  assert.equal(saved.body[0].content, original.body[0].content);
  assert.ok(!JSON.stringify(saved).includes("private-password"));
  assert.ok(!JSON.stringify(saved).includes("2099-01-01"));
  assert.equal(original.access_password, "private-password");
});

test("undoing an inserted block retains peer source and a detached draft exports it after reopening", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
  const initial = fields("基础正文"),
    seed = createScratch(initial, true),
    epoch = crypto.randomUUID();
  const { storage, branches } = memoryStorage();
  const session = new DraftSession(
    "http://example.invalid",
    "test",
    crypto.randomUUID(),
    "owner",
    initial,
    storage,
  );
  try {
    receive(session, {
      type: "sync",
      epoch,
      committed_seq: 0,
      revision: 1,
      payload: toBase64(Y.encodeStateAsUpdate(seed)),
    });
    const id = crypto.randomUUID();
    assert.ok(
      session.commandBlock(initial, {
        kind: "insert",
        before: null,
        block: { id, type: "markdown", content: "本人新增" },
      }),
    );
    session.doc.transact(
      () => blockText(session.doc, id).insert(4, "他人补充"),
      REMOTE,
    );
    session.undo.undo();
    const live = session.project(initial);
    assert.equal(live.body.length, 1);
    assert.match(session.removedBlocks(live)[0].content, /他人补充/);
    receive(session, {
      type: "control",
      epoch,
      merge: {
        id: crypto.randomUUID(),
        actor_id: crypto.randomUUID(),
        actor: "合并者",
        target_seq: 0,
        expires_at: new Date(Date.now() + 60000).toISOString(),
      },
    });
    session.continueLocal();
    const payload = await session.branchForMerge();
    const saved = branches.get(payload.branch_id)!;
    assert.match(saved.removedBlocks![0].content, /他人补充/);
    session.returnToLatest();
    session.openBranch(saved);
    assert.match(
      session.removedBlocks(session.project(initial))[0].content,
      /他人补充/,
    );
  } finally {
    await session.dispose();
    seed.destroy();
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
