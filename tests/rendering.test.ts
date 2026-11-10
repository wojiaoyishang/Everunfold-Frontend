import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderContent } from "../src/core/rendering/content";
import { CommentText } from "../src/themes/argon/components/comment-text";
import { content } from "./fixtures";
import { DomUtils, parseDocument } from "htmlparser2";
import { literalUnicodeEntities } from "../src/core/rendering/literal-unicode";

test("mixed HTML and Markdown are sanitized without executing legacy active content", () => {
  const result = renderContent(
    content({
      content: [
        {
          id: "a",
          type: "html",
          content:
            '<script>private-value</script><img src="javascript:alert(1)" onerror="alert(1)"><iframe src="https://example.com"></iframe><a href="jav&#x61;script:alert(1)">unsafe</a><h2 onclick="alert(1)">标题</h2>',
        },
        { id: "b", type: "markdown", content: "## 标题\n\n**保留正文**" },
      ],
    }),
  );
  assert.doesNotMatch(
    result.html,
    /script|onerror|onclick|iframe|private-value/i,
  );
  assert.match(result.html, /<strong>保留正文<\/strong>/);
  assert.deepEqual(
    result.toc.map((heading) => heading.id),
    ["heading-标题", "heading-标题-2"],
  );
});

test("virtual media mapping changes resource nodes but never code or plain text", () => {
  const result = renderContent(
    content({
      content: [
        {
          id: "a",
          type: "markdown",
          content:
            '![说明](site://media/image-1)\n\n`site://media/image-1`\n\n```html\n<img src="site://media/image-1">\n```',
        },
        {
          id: "b",
          type: "html",
          content:
            '<p>site://media/image-1</p><img src="site://media/image-1" alt="另一张">',
        },
      ],
      media_urls: {
        "image-1": {
          original: "/uploads/image.jpg",
          webp: "/uploads/image.webp",
        },
      },
    }),
  );
  assert.equal(
    (result.html.match(/src="\/uploads\/image.webp"/g) ?? []).length,
    2,
  );
  assert.match(result.html, /<code>site:\/\/media\/image-1<\/code>/);
  const frame = DomUtils.findOne(
    (node) => "data-code-frame" in node.attribs,
    parseDocument(result.html).children,
  );
  assert.equal(
    JSON.parse(frame!.attribs["data-code-source"]),
    '<img src="site://media/image-1">\n',
  );
  assert.match(result.html, /<p>site:\/\/media\/image-1<\/p>/);
});

test("missing and unsafe mapped media cannot become active URLs", () => {
  const result = renderContent(
    content({
      content: [
        {
          id: "a",
          type: "html",
          content:
            '<img src="site://media/unknown"><img src="site://media/bad"><video src="https://example.com/movie.mp4" autoplay></video>',
        },
      ],
      media_urls: { bad: { original: "javascript:alert(1)" } },
    }),
  );
  assert.doesNotMatch(result.html, /site:|javascript:|autoplay/);
  assert.match(result.html, /preload="none"/);
});

test("rendered HTML keeps Unicode literal while escaping markup characters", () => {
  const result = renderContent(
    content({
      content: [
        {
          id: "unicode",
          type: "html",
          content: "<p>假设 · ⚡ 中文</p><p>&lt;safe&gt; &amp;</p>",
        },
      ],
    }),
  );
  assert.match(result.html, /<p>假设 · ⚡ 中文<\/p>/);
  assert.match(result.html, /&lt;safe&gt; &amp;/);
  assert.doesNotMatch(result.html, /&#x(?:5047|8bbe|4e2d|6587);/);
  assert.doesNotMatch(
    literalUnicodeEntities(
      '<div data-code="&quot;&lt;script&gt;&quot;">假设</div>',
    ),
    /<script>/,
  );
});

test("plain historical comments preserve literal tags, entities and line breaks", () => {
  const html = renderToStaticMarkup(
    createElement(CommentText, {
      content: "模板<T> &amp; & 中文\n<script>示例</script>",
    }),
  );
  assert.match(
    html,
    /&lt;T&gt; &amp;amp; &amp; 中文\n&lt;script&gt;示例&lt;\/script&gt;/,
  );
  assert.doesNotMatch(html, /<script>|<T>/);
});
