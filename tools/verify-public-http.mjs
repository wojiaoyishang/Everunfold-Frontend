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
  assert.doesNotMatch(
    html,
    /FASTAPI_TO_NEXTJS|NEXTJS_TO_FASTAPI|allowed_peer_ips|postgresql\+asyncpg:/,
  );
  assert.doesNotMatch(html, /(?:src|href)="site:\/\/media\//);
  results.push({ route, status: response.status });
  return { html, document: parseDocument(html), response };
}

function articles(document) {
  return DomUtils.findAll(
    (node) =>
      node.name === "article" &&
      (node.attribs.class ?? "").split(" ").includes("post-card"),
    document.children,
  );
}

const home = await htmlAt("/");
assert.equal(
  articles(home.document).length,
  Math.min(10, snapshot.site.stats.articles),
);
assert.ok(
  DomUtils.textContent(home.document).includes(snapshot.site.hero_title),
);
if (snapshot.site.stats.articles > 10)
  assert.ok(articles((await htmlAt("/?page=2")).document).length > 0);
await htmlAt("/archives");
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
}
const detail = await htmlAt(firstArticle.path);
assert.equal(DomUtils.getElementsByTagName("h1", detail.document).length, 1);
const ordinaryPage = snapshot.contents.find((item) => item.kind === "page");
if (ordinaryPage) await htmlAt(ordinaryPage.path);
const commented = snapshot.contents.find(
  (item) => snapshot.comments[item.id]?.length,
);
if (commented) {
  const { document } = await htmlAt(commented.path);
  const comments = DomUtils.findAll(
    (node) => (node.attribs.class ?? "").split(" ").includes("comment"),
    document.children,
  );
  assert.equal(
    comments.length,
    Math.min(20, snapshot.comments[commented.id].length),
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
console.log(
  JSON.stringify(
    { passed: true, checks: results, capabilities: "public-read-only" },
    null,
    2,
  ),
);
