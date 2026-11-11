import test from "node:test";
import assert from "node:assert/strict";
import {
  readTranslationDrafts,
  translationDraftKey,
  writeTranslationDrafts,
} from "../src/core/settings/translation-draft-storage";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

test("translation drafts are isolated by site and account and survive reloads", () => {
  const storage = memoryStorage();
  const first = translationDraftKey("https://blog.example/", "user-1");
  const otherUser = translationDraftKey("https://blog.example", "user-2");
  const otherSite = translationDraftKey("https://other.example", "user-1");
  assert.notEqual(first, otherUser);
  assert.notEqual(first, otherSite);

  const drafts = {
    "public\0zh-CN\0工作台": "大香蕉",
    "admin\0zh-CN\0文章": "",
  };
  writeTranslationDrafts(storage, first, drafts);
  assert.deepEqual(readTranslationDrafts(storage, first), drafts);
  assert.equal(readTranslationDrafts(storage, otherUser), null);
  writeTranslationDrafts(storage, first, {});
  assert.equal(readTranslationDrafts(storage, first), null);
});

test("malformed local translation drafts are ignored", () => {
  const storage = memoryStorage();
  const key = translationDraftKey("https://blog.example", "user-1");
  storage.setItem(key, "{broken");
  assert.equal(readTranslationDrafts(storage, key), null);
  storage.setItem(key, JSON.stringify({ version: 99, drafts: {} }));
  assert.equal(readTranslationDrafts(storage, key), null);
});
