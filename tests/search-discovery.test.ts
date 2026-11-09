import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { snapshot, content } from "./fixtures";
import {
  sitemapEntries,
  feedItems,
  robotsRules,
  feedAlternates,
} from "../src/core/seo/discovery";
import { buildFeed } from "../src/core/seo/feeds";
import { articleSchema, StructuredData } from "../src/core/seo/structured-data";
import { contentMetadata } from "../src/core/content/metadata";
import { presentLegacyContent } from "../src/core/content/presentation";
import { parsePublicSnapshot } from "../src/core/content/validation";
const origin = "https://blog.example";
function settings() {
  return {
    site: {
      name: "Site",
      author: "Author",
      description: "",
      allow_indexing: true,
    },
    theme: {},
  };
}

test("sitemap excludes restricted and noindex pages and their alternate links", () => {
  const data = snapshot();
  data.contents[0].translations = [
    {
      id: "article-1",
      path: "/hello.html",
      language: "zh-CN",
      access: "public",
    },
    { id: "article-2", path: "/second.html", language: "en", access: "public" },
  ];
  data.contents[1].allow_indexing = false;
  data.contents.push(
    content({ id: "restricted", path: "/secret", access: "captcha" }),
  );
  data.pages = [
    {
      id: "p1",
      source: "custom",
      title: "Page",
      path: "/page",
      enabled: true,
      revision: 1,
    },
    {
      id: "p2",
      source: "custom",
      title: "Hidden",
      path: "/hidden",
      enabled: true,
      revision: 1,
      access: "captcha",
    },
  ];
  const map = sitemapEntries(data, origin);
  assert.ok(map.some((item) => item.url === origin + "/page"));
  assert.ok(!map.some((item) => /second|secret|hidden/.test(item.url)));
  assert.ok(!JSON.stringify(map).includes("second.html"));
  assert.ok(!map.find((item) => item.url === origin + "/page")?.lastModified);
  data.site.settings = settings();
  data.site.settings.site.allow_indexing = false;
  assert.deepEqual(sitemapEntries(data, origin), []);
  assert.deepEqual(feedItems(data), []);
  assert.equal(robotsRules(data.site, origin).sitemap, undefined);
  assert.equal(
    (robotsRules(data.site, origin).rules as { allow: string }).allow,
    "/",
  );
});

test("feeds use stable identities, escape markup and honor locale and limit", () => {
  const data = snapshot();
  data.site.settings = settings();
  data.site.settings.site.discovery = { feed_limit: 1 };
  data.contents[1].title = '<script>alert("x")</script> & title';
  data.contents[1].excerpt = "<p>plain & text</p>";
  data.contents[1].language = "en";
  const rss = buildFeed(data, origin, "rss", "en");
  assert.ok(rss.includes("&lt;script&gt;"));
  assert.ok(!rss.includes("<script>"));
  assert.match(rss, /urn:uuid:article-2/);
  assert.equal((rss.match(/<item>/g) ?? []).length, 1);
  assert.ok(!buildFeed(data, origin, "rss", "zh-CN").includes("article-2"));
  const atom = buildFeed(data, origin, "atom", "en");
  assert.match(atom, /<updated>2026-10-02T00:00:00Z<\/updated>/);
  data.site.settings.site.discovery.feeds_enabled = false;
  assert.deepEqual(feedItems(data), []);
});

test("article metadata honors site and content indexing with safe JSON-LD", () => {
  const data = snapshot();
  data.site.settings = settings();
  const article = presentLegacyContent(
    content({ title: "</script><script>alert(1)</script>", access: "public" }),
  );
  const schema = articleSchema(article, data.site, origin);
  const metadata = contentMetadata(
    article,
    data.site.name,
    origin,
    false,
    data.site,
  );
  assert.equal(
    metadata.alternates?.types?.["application/rss+xml"],
    origin + "/feed.xml",
  );
  assert.equal(metadata.alternates?.canonical, origin + article.path);
  const html = renderToStaticMarkup(
    createElement(StructuredData, { data: schema }),
  );
  assert.equal((html.match(/<script/g) ?? []).length, 1);
  assert.match(html, /\\u003c/);
  assert.equal(schema?.dateModified, article.updated_at);
  data.site.settings.site.allow_indexing = false;
  assert.equal(feedAlternates(data.site, origin), undefined);
  assert.deepEqual(
    contentMetadata(article, data.site.name, origin, false, data.site).robots,
    { index: false, follow: true },
  );
  assert.equal(articleSchema(article, data.site, origin), null);
  data.site.settings.site.allow_indexing = true;
  article.allow_indexing = false;
  assert.equal(articleSchema(article, data.site, origin), null);
});

test("page comments are accepted only for published public page identities", () => {
  const data = snapshot();
  const id = "00000000-0000-4000-8000-000000000001";
  data.pages = [
    {
      id,
      source: "custom",
      title: "Page",
      path: "/page",
      enabled: true,
      revision: 1,
    },
  ];
  data.comments[id] = [
    {
      id: "comment-1",
      author: "A",
      content: "Message",
      created_at: "2026-11-01T00:00:00Z",
      parent_id: null,
    },
  ];
  assert.doesNotThrow(() => parsePublicSnapshot(data));
  data.pages[0].access = "captcha";
  assert.throws(() => parsePublicSnapshot(data), /Restricted comments/);
});
