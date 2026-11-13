import assert from "node:assert/strict";
import test from "node:test";
import {
  changedHomeFeedHref,
  homeFeedType,
  preferredHomeHref,
} from "../src/core/browser/home-feed-policy";
import { queryFeed } from "../src/core/content/presentation";
import { archiveArticles, archiveRoute } from "../src/core/content/archive";
import { sitemapEntries } from "../src/core/seo/discovery";
import { category, content, snapshot, tag } from "./fixtures";

const origin = "https://blog.example.com/article.html";
test("a saved home filter becomes a public query while explicit URLs keep precedence", () => {
  assert.equal(preferredHomeHref("/", origin, "shuoshuo"), "/?type=shuoshuo");
  assert.equal(
    preferredHomeHref("/?page=2#main-content", origin, "article"),
    "/?page=2&type=article#main-content",
  );
  for (const route of [
    "/?type=all",
    "/?type=shuoshuo&page=2",
    "/?q=文字",
    "/?s=文字",
    "/search?q=文字",
    "/ss",
    "/article.html",
    "https://other.example.com/",
  ]) {
    assert.equal(preferredHomeHref(route, origin, "article"), route);
  }
  assert.equal(preferredHomeHref("/", origin, "all"), "/");
});
test("changing a home filter clears pagination without altering other browsing modes", () => {
  assert.equal(
    changedHomeFeedHref("https://blog.example.com/?page=8&type=article", "all"),
    "/?type=all",
  );
  assert.equal(
    changedHomeFeedHref("https://blog.example.com/ss?page=2", "article"),
    null,
  );
  assert.equal(
    changedHomeFeedHref("https://blog.example.com/?q=文字", "article"),
    null,
  );
  assert.equal(homeFeedType("page"), "all");
  assert.equal(homeFeedType("article"), "article");
});

test("homepage exclusions use stable taxonomy IDs before pagination", () => {
  const data = snapshot();
  data.contents = [
    content({ id: "excluded-category", pinned: true, tags: [] }),
    content({ id: "excluded-tag", categories: [] }),
    content({ id: "visible", categories: [], tags: [] }),
  ];
  const home = queryFeed(data, {
    pageSize: 1,
    excludeTaxonomies: [category.id, tag.id],
  });
  assert.deepEqual(
    home.items.map(({ content }) => content.id),
    ["visible"],
  );
  assert.equal(home.pages, 1);
  assert.equal(queryFeed(data, { query: "一篇文章" }).total, 3);
});

test("only public diary articles contribute a discoverable diary archive", () => {
  const data = snapshot();
  const diary = { ...category, slug: "gzrj" };
  data.contents = [
    content({ id: "ordinary" }),
    content({ id: "diary", path: "/diary.html", categories: [diary] }),
    content({ id: "page", kind: "page", path: "/page", categories: [diary] }),
  ];
  assert.equal(archiveRoute(data), "/article");
  assert.deepEqual(
    archiveArticles(data, true).map((item) => item.id),
    ["diary"],
  );
  assert.ok(
    sitemapEntries(data, origin).some(
      (item) => new URL(item.url).pathname === "/gzrj",
    ),
  );
  data.contents[1].access = "captcha";
  assert.ok(
    !sitemapEntries(data, origin).some(
      (item) => new URL(item.url).pathname === "/gzrj",
    ),
  );
});
