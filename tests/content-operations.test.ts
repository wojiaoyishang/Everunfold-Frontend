import test from "node:test";
import assert from "node:assert/strict";
import type { DraftListItem } from "@/core/contracts/content-admin";
import {
  parseCatalogQuery,
  catalogQuery,
} from "../src/core/content-management/catalog-query";
import {
  metadataPatch,
  metadataValues,
} from "../src/core/content-management/metadata-patch";
import { batchTargets } from "../src/core/content-management/batch-targets";
import { commentReadHeaders } from "../src/core/content/comment-read-grant";

const row: DraftListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  type_id: "article",
  title: "Original",
  excerpt: "Summary",
  preview: "Body",
  revision: 4,
  collaboration_seq: 11,
  author: "author",
  status: "draft",
  is_demo: false,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-02T00:00:00Z",
  language: "zh-CN",
  categories: ["A"],
  tags: ["B"],
  pinned: true,
  comments_open: true,
};
test("catalog restores combined filters, search, ordering and pagination without trusting invalid values", () => {
  const saved = parseCatalogQuery(
    "?status=scheduled&language=en&category=A&tag=B&search=test+phrase&direction=asc&order_by=title&page=3&updated_from=2026-11-01T00%3A00%3A00Z",
  );
  assert.equal(saved.filters.status, "scheduled");
  assert.equal(saved.filters.language, "en");
  assert.equal(saved.filters.updated_from, "2026-11-01T00:00:00.000Z");
  assert.deepEqual(
    parseCatalogQuery(catalogQuery(saved.filters, saved.search, saved.page)),
    saved,
  );
  const bad = parseCatalogQuery(
    "?status=secret&order_by=body&author_id=------------------------------------&page=1.5&updated_to=not-a-date",
  );
  assert.equal(bad.filters.status, "all");
  assert.equal(bad.filters.order_by, "updated_at");
  assert.equal(bad.filters.author_id, null);
  assert.equal(bad.filters.updated_to, null);
  assert.equal(bad.page, 1);
});
test("quick metadata patch preserves omitted fields and transmits explicit false and clearing", () => {
  const original = metadataValues(row);
  assert.deepEqual(metadataPatch(original, { ...original }), {});
  const patch = metadataPatch(original, {
    ...original,
    excerpt: "",
    categories: [],
    pinned: false,
    comments_open: false,
  });
  assert.deepEqual(patch, {
    excerpt: "",
    categories: { mode: "replace", values: [] },
    pinned: false,
    comments_open: false,
  });
  assert.ok(!("body" in patch));
  assert.ok(!("title" in patch));
  assert.deepEqual(original.categories, ["A"]);
});
test("bulk targets are explicit language members with independent revisions and live watermarks", () => {
  const en = {
    ...row,
    id: "22222222-2222-4222-8222-222222222222",
    language: "en",
    revision: 8,
    collaboration_seq: 23,
  };
  const retired = {
    ...row,
    id: "33333333-3333-4333-8333-333333333333",
    language: "ja",
    status: "trash" as const,
  };
  const group = {
    ...row,
    translations: [
      { ...row, language: "zh-CN", is_original: true },
      { ...en, is_original: false },
      { ...retired, is_original: false },
    ],
  };
  assert.deepEqual(
    batchTargets([group], "original", false).map((v) => v.id),
    [row.id],
  );
  assert.deepEqual(
    batchTargets([group, group], "all", false).map((v) => v.id),
    [row.id, en.id],
  );
  assert.deepEqual(batchTargets([group], "en", false), [
    {
      id: en.id,
      title: en.title,
      language: "en",
      expected_revision: 8,
      expected_seq: 23,
    },
  ]);
  assert.deepEqual(
    batchTargets([group], "all", true).map((v) => v.id),
    [retired.id],
  );
  assert.deepEqual(batchTargets([group], "fr", false), []);
});
test("comment read grants require both values and are carried in contract-owned headers", () => {
  assert.deepEqual(commentReadHeaders(row.id), {});
  assert.deepEqual(commentReadHeaders(undefined, "private-proof"), {});
  assert.deepEqual(commentReadHeaders(row.id, "private-proof"), {
    "X-Everunfold-Read-Target": row.id,
    "X-Everunfold-Read-Receipt": "private-proof",
  });
});
