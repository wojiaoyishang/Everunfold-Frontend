import assert from "node:assert/strict";
import test from "node:test";
import { content, snapshot } from "./fixtures";
import { localizedSnapshot, languageContents } from "../src/core/i18n/snapshot";
import { localizeHref, localePath } from "../src/core/i18n/locale";
import {
  publicFeed,
  queryFeed,
  resolvePresentation,
} from "../src/core/content/presentation";
import { contentMetadata } from "../src/core/content/metadata";
import { translate } from "../src/core/i18n/messages";
import { articleNeighbors, relatedArticles } from "../src/core/content/related";

function bilingual() {
  const value = snapshot();
  const original = content({
    translation_group_id: "group",
    title: "原文",
    path: "/original.html",
  });
  const english = content({
    id: "en-version",
    translation_group_id: "group",
    language: "en",
    title: "English needle",
    path: "/custom-english.html",
  });
  const translations = [
    {
      id: original.id,
      path: original.path,
      language: "zh-CN",
      access: "public" as const,
      is_original: true,
    },
    {
      id: english.id,
      path: english.path,
      language: "en",
      access: "public" as const,
      is_original: false,
    },
  ];
  original.translations = translations;
  english.translations = translations;
  value.contents = [
    original,
    english,
    content({ id: "untranslated", path: "/untranslated.html" }),
  ];
  return value;
}
test("language feeds choose one real member per group before paging and preserve fallback paths", () => {
  const source = bilingual(),
    english = localizedSnapshot(source, "en");
  assert.deepEqual(
    publicFeed(english).map((item) => item.content.id),
    ["en-version", "untranslated"],
  );
  assert.equal(queryFeed(english, { pageSize: 1 }).total, 2);
  assert.equal(languageContents(source.contents, "zh-CN")[0].title, "原文");
  assert.equal(
    resolvePresentation(english, "/original.html")?.content.language,
    "zh-CN",
  );
  assert.equal(english.site.contentLocales?.["/custom-english.html"], "en");
  assert.equal(source.site.locale, undefined);
});
test("search matches languages before group deduplication and paging", () => {
  const value = localizedSnapshot(bilingual(), "zh-CN");
  assert.equal(queryFeed(value, { query: "English needle" }).total, 0);
  const result = queryFeed(value, {
    query: "English needle",
    allLanguages: true,
    pageSize: 1,
  });
  assert.equal(result.total, 1);
  assert.equal(result.items[0].content.id, "en-version");
});
test("recommendations and chronological neighbors exclude a story's own translations", () => {
  const value = localizedSnapshot(bilingual(), "en"),
    english = value.contents[1];
  assert.deepEqual(
    relatedArticles(value, english).map((item) => item.id),
    ["untranslated"],
  );
  const neighbors = articleNeighbors(value, english);
  assert.notEqual(neighbors.previous?.id, value.contents[0].id);
  assert.notEqual(neighbors.next?.id, value.contents[0].id);
});
test("locale links prefix structural routes while preserving custom content, queries and fragments", () => {
  assert.equal(
    localizeHref("/search?q=test#results", "en"),
    "/en/search?q=test#results",
  );
  assert.equal(localizeHref("/en/ss?page=2", "zh-CN"), "/ss?page=2");
  assert.equal(localizeHref("/original.html", "en"), "/original.html");
  assert.equal(localizeHref("/admin", "en"), "/admin");
  assert.equal(
    localizeHref("https://elsewhere.invalid/", "en"),
    "https://elsewhere.invalid/",
  );
  assert.equal(localePath("/english.html"), "zh-CN");
});
test("metadata uses reciprocal public alternatives and each version's own canonical", () => {
  const value = localizedSnapshot(bilingual(), "en"),
    entry = resolvePresentation(value, "/custom-english.html")!;
  const metadata = contentMetadata(
    entry.content,
    "Site",
    "http://example.invalid",
  );
  assert.equal(
    metadata.alternates?.canonical,
    "http://example.invalid/custom-english.html",
  );
  assert.equal(
    metadata.alternates?.languages?.["zh-CN"],
    "http://example.invalid/original.html",
  );
  entry.content.translations![0].access = "password";
  assert.equal(
    contentMetadata(entry.content, "Site", "http://example.invalid").alternates
      ?.languages?.["zh-CN"],
    undefined,
  );
});
test("program dictionaries fall back without changing source strings", () => {
  assert.equal(translate("语言与译文", "en"), "Language and translations");
  assert.equal(translate("User-written title", "en"), "User-written title");
  assert.equal(translate("语言与译文", "zh-CN"), "语言与译文");
  assert.equal(
    translate("“{query}” 找到 {count} 条内容", "en", {
      query: "原文",
      count: 2,
    }),
    "2 results for “原文”",
  );
});

test("legacy snapshots retain their own published language without invented translations", () => {
  const value = snapshot();
  value.contents = [content({ path: "/中文.html" })];
  const localized = localizedSnapshot(value, "en");
  assert.equal(localized.site.contentTranslations?.["/中文.html"].length, 1);
  assert.equal(
    localized.site.contentTranslations?.["/中文.html"][0].language,
    "zh-CN",
  );
});
