import assert from "node:assert/strict";
import test from "node:test";
import {
  changedHomeFeedHref,
  homeFeedType,
  preferredHomeHref,
} from "../src/core/browser/home-feed-policy";

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
