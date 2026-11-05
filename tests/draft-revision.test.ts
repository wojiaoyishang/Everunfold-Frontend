import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";
import { DraftSession } from "../src/core/collaboration/session";
import { readServerFrame } from "../src/core/collaboration/wire";

test("a newer shared revision can advance with ordinary edits while private access changes remain guarded", async () => {
  const { hasPrivateDraftChanges } =
    await import("../src/core/content-management/draft-revision");
  const saved = {
    settings: { visibility: "public", opens_at: null },
  } as import("../src/generated/content-admin-contract").DraftDetail;
  assert.equal(
    hasPrivateDraftChanges({ title: "新标题", body: [], settings: {} }, saved),
    false,
  );
  assert.equal(
    hasPrivateDraftChanges(
      { body: [], settings: { visibility: "password" } },
      saved,
    ),
    true,
  );
  assert.equal(
    hasPrivateDraftChanges(
      { body: [], access_password: "local-private-change" },
      saved,
    ),
    true,
  );
  assert.equal(
    hasPrivateDraftChanges(
      { body: [], settings: { opens_at: "2026-12-01T00:00:00Z" } },
      saved,
    ),
    true,
  );
});

test("a revision arriving before its source update cannot release the real session save cutoff", async () => {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
  const session = new DraftSession(
    "http://example.invalid",
    "test-csrf",
    crypto.randomUUID(),
    "test-user",
  );
  // Deliver transport frames through the actual decoder/receiver; no socket or IDB is opened.
  const receive = (
    frame: import("../src/generated/collaboration-contract").ServerFrame,
  ) =>
    (session as unknown as { receive: (value: typeof frame) => void }).receive(
      readServerFrame(JSON.stringify(frame)),
    );
  const empty = new Y.Doc();
  const payload = Buffer.from(Y.encodeStateAsUpdate(empty)).toString("base64");
  empty.destroy();
  let saving: Promise<number> | undefined;
  let settled = false;
  try {
    session.epoch = crypto.randomUUID();
    receive({
      type: "sync",
      epoch: session.epoch,
      committed_seq: 0,
      revision: 1,
      payload,
    });
    session.onRevision = () => {
      saving = session.cutoff();
      void saving.then(
        () => {
          settled = true;
        },
        () => {},
      );
    };
    receive({ type: "revision", revision: 2, committed_seq: 1 });
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(
      settled,
      false,
      "the new revision must not authorize saving the older body",
    );
    receive({
      type: "update",
      committed_seq: 1,
      update_id: crypto.randomUUID(),
      payload,
    });
    assert.equal(await saving, 1);
    assert.equal(settled, true);
  } finally {
    await session.dispose();
    await saving?.catch(() => {});
    if (priorWindow) Object.defineProperty(globalThis, "window", priorWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
