import assert from "node:assert/strict";
import test from "node:test";
import {
  pageNumber,
  queryContents,
  resolveContent,
} from "../src/core/content/query";
import { publicHref, resourceUrl } from "../src/core/content/urls";
import { parsePublicSnapshot } from "../src/core/content/validation";
import { content, snapshot } from "./fixtures";

test("lists filter articles and paginate stable results", () => {
  const data = snapshot();
  assert.deepEqual(
    queryContents(data, { pageSize: 1 }).items.map((entry) => entry.id),
    ["article-2"],
  );
  assert.deepEqual(
    queryContents(data, { page: 2, pageSize: 1 }).items.map(
      (entry) => entry.id,
    ),
    ["article-1"],
  );
  assert.equal(queryContents(data, { tag: "code" }).total, 1);
  assert.equal(queryContents(data, { category: "absent" }).total, 0);
  assert.equal(queryContents(data, { query: "不同正文" }).total, 1);
  assert.deepEqual(queryContents(data, { page: 9 }).items, []);
});
test("direct content resolution preserves imported paths and real missing results", () => {
  const data = snapshot();
  data.contents.push(content({ id: "chinese", path: "/中文.html" }));
  assert.equal(resolveContent(data, "/%E4%B8%AD%E6%96%87.html")?.id, "chinese");
  assert.equal(resolveContent(data, "/missing.html"), undefined);
  assert.equal(pageNumber("-1"), 1);
  assert.equal(pageNumber("2"), 2);
});
test("snapshot validation rejects malformed, duplicate and orphan structures", () => {
  assert.equal(parsePublicSnapshot(snapshot()).generation, 1);
  assert.throws(() =>
    parsePublicSnapshot({ ...snapshot(), schema_version: "wrong" }),
  );
  const duplicate = snapshot();
  duplicate.contents.push(duplicate.contents[0]);
  assert.throws(() => parsePublicSnapshot(duplicate));
  assert.throws(() =>
    parsePublicSnapshot({ ...snapshot(), comments: { unknown: [] } }),
  );
  const hostile = snapshot();
  hostile.contents[0].path = "//example.com";
  assert.throws(() => parsePublicSnapshot(hostile));
});
test("URLs reject active schemes and preserve unrelated external origins", () => {
  assert.equal(publicHref("javascript:alert(1)"), null);
  assert.equal(publicHref("//example.com/"), null);
  assert.equal(resourceUrl("data:image/svg+xml,bad"), null);
  assert.equal(
    publicHref("https://example.com/story.html"),
    "https://example.com/story.html",
  );
  assert.equal(resourceUrl("/uploads/photo.jpg"), "/uploads/photo.jpg");
});
