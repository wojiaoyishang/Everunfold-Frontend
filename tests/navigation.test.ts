import assert from "node:assert/strict";
import test from "node:test";
import {
  clientNavigationHref,
  searchHref,
} from "../src/core/navigation/targets";

const current = "http://127.0.0.1:3000/first.html?comments_page=2";

test("same-origin page navigation preserves query, Unicode paths and destination anchors", () => {
  assert.equal(
    clientNavigationHref(current, "/next.html#heading"),
    "/next.html#heading",
  );
  assert.equal(
    clientNavigationHref(current, "/first.html?comments_page=3#comments"),
    "/first.html?comments_page=3#comments",
  );
  assert.equal(
    clientNavigationHref(current, "http://127.0.0.1:3000/中文.html"),
    "/%E4%B8%AD%E6%96%87.html",
  );
  assert.equal(clientNavigationHref(current, "#comments"), null);
  assert.equal(clientNavigationHref(current, current), null);
});

test("enhancement never hijacks browser gestures, external links or downloads", () => {
  for (const intent of [
    { button: 1 },
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { download: true },
    { external: true },
    { target: "_blank" },
  ]) {
    assert.equal(clientNavigationHref(current, "/next.html", intent), null);
  }
  for (const href of [
    "https://example.com/story",
    "mailto:reader@example.com",
    "javascript:alert(1)",
    "/uploads/wordpress/photo.webp",
    "/book.pdf",
    "/api/v1/site",
    "http://user:password@127.0.0.1:3000/private",
  ]) {
    assert.equal(clientNavigationHref(current, href), null);
  }
});

test("search navigation has one shareable GET destination and bounds query input", () => {
  assert.equal(
    searchHref("  中文 & café  "),
    "/search?q=%E4%B8%AD%E6%96%87+%26+caf%C3%A9",
  );
  assert.equal(searchHref("   "), "/search");
  assert.equal(
    new URL(searchHref("a".repeat(200)), current).searchParams.get("q")?.length,
    160,
  );
});
