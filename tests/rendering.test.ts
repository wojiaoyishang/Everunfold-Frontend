import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderContent } from "../src/core/rendering/content";
import { CommentText } from "../src/themes/argon/components/comment-text";
import { content } from "./fixtures";
import { expandPresentationShortcodes } from "../src/core/rendering/shortcodes";

test("presentation shortcodes nest, escape attributes and sanitize their bodies", () => {
  const result = renderContent(
    content({
      content: [
        {
          id: "legacy",
          type: "html",
          content:
            '[collapse title="提示" collapsed="false" color="indigo"][alert title="<img src=x onerror=alert(1)>注意" color="orange"]<script>private-value</script><b>保留正文</b>[/alert][/collapse] [tooltips content=\'a" onclick="bad\']词[/tooltips]',
        },
      ],
    }),
  );
  assert.match(
    result.html,
    /<details class="legacy-collapse tone-indigo" open/,
  );
  assert.match(result.html, /<summary>提示<\/summary>/);
  assert.match(result.html, /legacy-alert tone-orange/);
  assert.match(result.html, /<b>保留正文<\/b>/);
  assert.doesNotMatch(result.html, /<script|private-value|onerror| onclick="/);
  assert.match(result.html, /a&quot; onclick=&quot;bad/);
});

test("shortcode expansion leaves code, HTML attributes, unknown and unclosed tags literal", () => {
  for (const raw of [
    '```html\n[collapse title="示例"]text[/collapse]\n```',
    "`[alert]example[/alert]`",
    "<pre>[collapse]literal[/collapse]</pre>",
    "<code>[alert]literal[/alert]</code>",
    '<a title="[alert]title[/alert]">link</a>',
    "[unknown]text[/unknown]",
    "[collapse]unfinished [alert]nested[/alert]",
  ])
    assert.equal(expandPresentationShortcodes(raw), raw);
  const result = renderContent(
    content({
      content: [
        {
          id: "md",
          type: "markdown",
          content: '[collapse title="Markdown"]\n\n**强调**\n\n[/collapse]',
        },
      ],
    }),
  );
  assert.match(result.html, /<strong>强调<\/strong>/);
});

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
  assert.match(result.html, /&lt;img src="site:\/\/media\/image-1"&gt;/);
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
