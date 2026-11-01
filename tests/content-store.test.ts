import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { FileContentStore } from "../src/server/content/store";
import {
  jsonDigest,
  publishImmutableJson,
} from "../src/server/storage/immutable-json";
import { snapshot } from "./fixtures";

const release = (epoch: string, revision: number, withdrawn = false) => ({
  protocol: "content-1",
  node_id: "test",
  source_epoch: epoch,
  resource: "public-content",
  revision,
  value: {
    ...snapshot(),
    source_epoch: epoch,
    generation: revision,
    ...(withdrawn ? { contents: [], comments: {} } : {}),
  },
});
test("public releases survive concurrent/replayed delivery and withdrawal cannot regress", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-content-"));
  const epoch = randomUUID();
  const store = new FileContentStore(root, "test", epoch);
  assert.equal(await store.read(), null);
  await Promise.all([
    store.apply(release(epoch, 1)),
    store.apply(release(epoch, 3, true)),
    store.apply(release(epoch, 3, true)),
  ]);
  assert.equal((await store.read())?.generation, 3);
  assert.deepEqual((await store.read())?.contents, []);
  await store.apply(release(epoch, 2));
  const restarted = new FileContentStore(root, "test", epoch);
  assert.deepEqual((await restarted.read())?.contents, []);
  await assert.rejects(store.apply(release(epoch, 3)));
  await assert.rejects(store.apply(release(randomUUID(), 4)));
  await assert.rejects(store.apply({ ...release(epoch, 4), node_id: "other" }));
  await assert.rejects(store.apply({ ...release(epoch, 4), revision: 5 }));
});
test("a durable newer intent fails closed through restart until its exact complete snapshot arrives", async () => {
  const root = await mkdtemp(
    path.join(tmpdir(), "everunfold-content-barrier-"),
  );
  const epoch = randomUUID();
  const store = new FileContentStore(root, "test", epoch);
  await store.apply(release(epoch, 1));
  const next = release(epoch, 2, true);
  const folder = path.join(root, "releases", "test", epoch);
  await publishImmutableJson(
    path.join(folder, "public-content.2.intent.json"),
    { revision: 2, digest: jsonDigest(next) },
  );
  await assert.rejects(new FileContentStore(root, "test", epoch).read());
  await store.apply(release(epoch, 1));
  await assert.rejects(store.read());
  await store.apply(next);
  assert.deepEqual((await store.read())?.contents, []);
  await writeFile(
    path.join(folder, "public-content.2.snapshot.json"),
    "broken",
  );
  await assert.rejects(store.read());
  await assert.rejects(new FileContentStore(root, "test", randomUUID()).read());
});
