import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DomUtils, parseDocument } from "htmlparser2";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const origin = process.argv[2] ?? "http://127.0.0.1:3000";
const snapshotPath =
  process.argv[3] ??
  path.join(projectRoot, "var/public-snapshots/current.json");
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const results = [];

async function htmlAt(route, expectedStatus = 200) {
  const response = await fetch(new URL(route, origin), { redirect: "manual" });
  assert.equal(response.status, expectedStatus, `${route} HTTP status`);
  const html = await response.text();
  if (expectedStatus === 200)
    assert.match(
      html,
      /<span\b[^>]*data-page-ready="true"[^>]*>/,
      `${route} prepared page marker`,
    );
  assert.doesNotMatch(
    html,
    /FASTAPI_TO_NEXTJS|NEXTJS_TO_FASTAPI|allowed_peer_ips|postgresql\+asyncpg:/,
  );
  assert.doesNotMatch(html, /(?:src|href)="site:\/\/media\//);
  results.push({ route, status: response.status });
  return { html, document: parseDocument(html), response };
}

function articles(document, mixed = false) {
  return DomUtils.findAll(
    (node) =>
      node.name === "article" &&
      (node.attribs.class ?? "")
        .split(" ")
        .some(
          (name) => name === "post-card" || (mixed && name === "shuoshuo-card"),
        ),
    document.children,
  );
}

const withClass = (name, root) =>
  DomUtils.findAll(
    (node) => (node.attribs.class ?? "").split(" ").includes(name),
    root.children,
  );

const home = await htmlAt("/");
assert.equal(articles(home.document, true).length, 10);
assert.equal(withClass("feed-tabs", home.document).length, 0);
assert.equal(
  DomUtils.getElementById("overview-tab", home.document.children),
  null,
);
assert.ok(DomUtils.textContent(home.document).includes("首页内容"));
assert.ok(!DomUtils.textContent(home.document).includes("说说暂为示例内容"));
const onlyArticles = await htmlAt("/?type=article");
assert.equal(articles(onlyArticles.document).length, 10);
assert.equal(withClass("shuoshuo-card", onlyArticles.document).length, 0);
const onlyMoments = await htmlAt("/?type=shuoshuo");
assert.equal(articles(onlyMoments.document).length, 0);
assert.equal(withClass("shuoshuo-card", onlyMoments.document).length, 4);
assert.ok(
  DomUtils.textContent(home.document).includes(snapshot.site.hero_title),
);
if (snapshot.site.stats.articles > 10)
  assert.ok(articles((await htmlAt("/?page=2")).document).length > 0);
await htmlAt("/archives");
await htmlAt("/article/");
const moments = await htmlAt("/ss");
assert.equal(articles(moments.document, true).length, 4);
assert.equal(articles(moments.document).length, 0);
const sample = await htmlAt("/shuoshuo/preview-long-walk");
assert.match(sample.html, /reader-reference/);
assert.match(sample.html, /name="robots" content="noindex"/);
const closed = await htmlAt("/shuoshuo/preview-quiet");
assert.ok(DomUtils.textContent(closed.document).includes("评论已关闭"));
assert.equal(
  DomUtils.getElementById("comment-composer", closed.document.children),
  null,
);
const shuoshuoSearch = await htmlAt(
  "/search?q=" + encodeURIComponent("皮卡丘") + "&type=shuoshuo",
);
assert.equal(articles(shuoshuoSearch.document, true).length, 1);
assert.equal(articles(shuoshuoSearch.document).length, 0);
const noResult = await htmlAt(
  "/search?q=this-keyword-has-no-match&type=shuoshuo",
);
assert.ok(DomUtils.textContent(noResult.document).includes("没有找到相关内容"));
await htmlAt("/shuoshuo/unknown-example", 404);
await htmlAt("/categories");
await htmlAt("/tags");
const firstArticle = snapshot.contents.find((item) => item.kind === "article");
assert.ok(firstArticle);
const search = await htmlAt(
  `/search?q=${encodeURIComponent(firstArticle.title)}`,
);
assert.ok(articles(search.document).length > 0);
const legacy = await htmlAt("/?s=%E7%9A%84");
for (const anchor of DomUtils.getElementsByTagName("a", legacy.document)) {
  if (anchor.attribs.href?.includes("page="))
    assert.ok(anchor.attribs.href.includes("q="));
}
for (const kind of ["category", "tag"]) {
  const term = snapshot.taxonomies.find(
    (item) => item.kind === kind && item.count > 0,
  );
  if (term) await htmlAt(`/${kind}/${encodeURIComponent(term.slug)}`);
  const unicodeTerm = snapshot.taxonomies.find(
    (item) =>
      item.kind === kind && item.count > 0 && /[^\x00-\x7F]/.test(item.slug),
  );
  if (unicodeTerm && unicodeTerm.id !== term?.id)
    await htmlAt(`/${kind}/${encodeURIComponent(unicodeTerm.slug)}`);
}
const detail = await htmlAt(firstArticle.path);
assert.equal(DomUtils.getElementsByTagName("h1", detail.document).length, 1);
assert.match(detail.html, /property="og:title"/);
assert.match(detail.html, /property="og:type" content="article"/);
const chronological = snapshot.contents
  .filter((item) => item.kind === "article")
  .sort(
    (a, b) =>
      Date.parse(b.published_at) - Date.parse(a.published_at) ||
      a.id.localeCompare(b.id),
  );
for (const item of [chronological[0], chronological.at(-1)]) {
  const { document } =
    item.id === firstArticle.id ? detail : await htmlAt(item.path);
  assert.equal(withClass("neighbor-card", document).length, 2);
  assert.equal(
    withClass("neighbor-empty", document).length,
    chronological.length === 1 ? 2 : 1,
  );
  assert.equal(withClass("neighbor-empty", document)[0].name, "div");
  assert.equal(
    withClass("related-card", document).length,
    Math.min(6, chronological.length - 1),
  );
}
const ordinaryPage = snapshot.contents.find((item) => item.kind === "page");
if (ordinaryPage) {
  const { document } = await htmlAt(ordinaryPage.path);
  assert.equal(withClass("article-neighbors", document).length, 0);
}
const commented = snapshot.contents.find(
  (item) => snapshot.comments[item.id]?.length,
);
if (commented) {
  const { document } = await htmlAt(commented.path);
  const historicalIds = (root) =>
    withClass("comment", root)
      .filter((node) => withClass("origin-history", node).length > 0)
      .map((node) => node.attribs.id);
  const seen = historicalIds(document);
  const pagination = withClass("comment-pagination", document)[0];
  const pages = pagination
    ? Number(
        DomUtils.textContent(pagination).match(
          /第\s*\d+\s*\/\s*(\d+)\s*页/,
        )?.[1],
      )
    : 1;
  assert.ok(Number.isInteger(pages) && pages >= 1);
  for (let page = 2; page <= pages; page++) {
    const destination = new URL(commented.path, origin);
    destination.searchParams.set("comments_page", String(page));
    seen.push(
      ...historicalIds(
        (await htmlAt(destination.pathname + destination.search)).document,
      ),
    );
  }
  // Demo rows must neither inflate the real count nor hide imported comments.
  assert.deepEqual(
    seen.sort(),
    snapshot.comments[commented.id]
      .map((comment) => `comment-${comment.id}`)
      .sort(),
  );
}
await htmlAt("/this-path-was-not-published", 404);
await htmlAt("/category/this-category-was-not-published", 404);
const ready = await fetch(new URL("/health/ready", origin));
assert.equal(ready.status, 200);
assert.deepEqual((await ready.json()).data, {
  public_read: true,
  cache_receiver: false,
});
const background = await fetch(
  new URL("/reference/campfire-background.webp", origin),
  { method: "HEAD" },
);
assert.equal(background.status, 200);
assert.ok(background.headers.get("content-type")?.startsWith("image/"));
for (const sticker of ["dinosaur/1", "dinosaur/16", "flower/1", "flower/14"]) {
  const response = await fetch(
    new URL(`/reference/stickers/${sticker}.jpg`, origin),
    { method: "HEAD" },
  );
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-type")?.startsWith("image/"));
}
console.log(
  JSON.stringify(
    { passed: true, checks: results, capabilities: "public-read-only" },
    null,
    2,
  ),
);
