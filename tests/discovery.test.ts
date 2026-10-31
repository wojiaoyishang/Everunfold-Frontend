import assert from "node:assert/strict";
import test from "node:test";
import { relatedArticles } from "../src/core/content/related";
import { contentMetadata } from "../src/core/content/metadata";
import { presentLegacyContent } from "../src/core/content/presentation";
import { content, snapshot } from "./fixtures";
test("related reading is deterministic, excludes pages and the current article, and does not mutate source", () => {
  const source = snapshot();
  source.contents.push(
    content({
      id: "older-related",
      path: "/older.html",
      published_at: "2026-01-01T00:00:00Z",
    }),
  );
  const before = JSON.stringify(source);
  assert.deepEqual(
    relatedArticles(source, source.contents[0]).map((entry) => entry.id),
    ["older-related", "article-2"],
  );
  assert.equal(JSON.stringify(source), before);
});
test("share metadata uses the configured public origin and excludes preview canonical and restricted text", () => {
  const item = presentLegacyContent(content({ cover_url: "/public.jpg" }));
  const metadata = contentMetadata(item, "测试", "https://blog.example.com");
  assert.equal(
    metadata.alternates?.canonical,
    "https://blog.example.com/hello.html",
  );
  assert.match(
    JSON.stringify(metadata.openGraph),
    /https:\/\/blog.example.com\/public.jpg/,
  );
  assert.equal(contentMetadata(item, "测试").alternates, undefined);
  assert.equal(
    contentMetadata(item, "测试", "https://blog.example.com", true).alternates,
    undefined,
  );
  const limited = contentMetadata(
    { ...item, access: "password", excerpt: "sensitive-excerpt" },
    "测试",
  );
  assert.doesNotMatch(
    JSON.stringify(limited),
    /sensitive-excerpt|public.jpg|localhost/,
  );
});
