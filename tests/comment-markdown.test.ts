import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment } from "react";
import { commentMarkdown } from "../src/core/rendering/comment-markdown";

test("comment Markdown shares a safe, closed vocabulary for preview and display", () => {
  const html = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      commentMarkdown(
        "**文字**\n\n- 第一项\n- [链接](https://example.com)\n\n```js\nconst n = 1;\n```\n\n![微笑](/reference/stickers/flower/1.jpg)",
      ),
    ),
  );
  assert.match(html, /<strong>文字<\/strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /rel="nofollow noopener noreferrer"/);
  assert.match(html, /<pre><code>const n = 1;/);
  assert.match(html, /data-sticker="true"/);
});
test("comments do not execute HTML or dangerous links, including image URLs", () => {
  const html = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      commentMarkdown(
        "<script>example</script>\n\n[x](javascript:alert(1)) ![x](data:text/html;base64,abc)\n\n<img src=x onerror=bad>",
      ),
    ),
  );
  assert.doesNotMatch(html, /<script|<img|href="javascript:|src="data:/);
  assert.match(html, /&lt;script&gt;example/);
});
