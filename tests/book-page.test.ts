import assert from "node:assert/strict";
import test from "node:test";
import { hasPublicRoute, publicCodePaths } from "../src/core/content/routes";
import { localizedCodePath } from "../src/core/i18n/routes";
import {
  pageArticleCategory,
  pageArticleCollection,
  pageArticleSources,
} from "../src/core/pages/articles";
import { pageManifest } from "../src/core/pages/registry";
import { sitemapEntries } from "../src/core/seo/discovery";
import type { PublicManagedPage } from "../src/core/contracts/pages";
import { category, content, snapshot, tag } from "./fixtures";

const sourceCategory = {
  ...category,
  id: "d9a081e8-8465-43d8-9d5a-c19a0cfce9b1",
  slug: "renamed-category",
  name: "更新后的分类名",
};
const published: PublicManagedPage = {
  id: "c30da85d-f1c6-4157-80f6-33162b086660",
  title: "测试书籍",
  path: "/reading/book-one",
  enabled: true,
  revision: 1,
  source: "registered",
  implementation_id: "core.book",
  implementation_version: "1.0.0",
  options: { category_id: sourceCategory.id, cover_url: "" },
};

test("the book is a registered page and only its published address is discoverable", () => {
  const data = snapshot();
  data.pages = [];
  const paths = () =>
    sitemapEntries(data, "https://blog.example").map(
      ({ url }) => new URL(url).pathname,
    );
  assert.equal(
    pageManifest.pages.find((page) => page.id === "core.book")?.path,
    "/book",
  );
  assert.ok(!publicCodePaths.has("/book"));
  assert.ok(!hasPublicRoute(data, "/book"));
  assert.ok(!hasPublicRoute(data, "/gzrj"));
  assert.equal(localizedCodePath(data, "/en/gzrj"), null);
  data.pages = [published];
  assert.ok(hasPublicRoute(data, published.path));
  assert.ok(paths().includes(published.path));
  assert.ok(!paths().includes("/gzrj"));
});

test("book collection uses the category ID, omits protected content, and paginates after language selection", () => {
  const data = snapshot();
  data.contents = [
    content({
      id: "same-name",
      categories: [{ ...sourceCategory, id: category.id }],
    }),
    content({ id: "locked", access: "password", categories: [sourceCategory] }),
    content({ id: "hidden-page", kind: "page", categories: [sourceCategory] }),
    content({
      id: "recent",
      published_at: "2026-11-01T00:00:00Z",
      categories: [sourceCategory],
    }),
    content({
      id: "original",
      translation_group_id: "book-translation",
      categories: [sourceCategory],
      tags: [tag],
    }),
    content({
      id: "english",
      language: "en",
      translation_group_id: "book-translation",
      categories: [sourceCategory],
    }),
  ];
  const selected = pageArticleCategory(published, "category_id");
  const source = pageArticleSources(data, selected);
  assert.equal(source.length, 3);
  assert.ok(
    source.every((item) => !("content" in item) && !("excerpt" in item)),
  );
  const result = pageArticleCollection(source, selected, "en", 2, 1);
  assert.equal(result.total, 2);
  assert.equal(result.pages, 2);
  assert.equal(result.categoryName, sourceCategory.name);
  assert.deepEqual(
    result.items.map((item) => item.id),
    ["english"],
  );
  assert.equal(pageArticleCollection(source, selected, "en", 500, 1).page, 2);
  assert.equal(pageArticleCollection(source, undefined, "en", 1, 1).total, 0);
});
