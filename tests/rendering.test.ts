import assert from "node:assert/strict";
import test from "node:test";
import { renderComment, renderContent } from "../src/core/rendering/content";
import { content } from "./fixtures";

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

test("historical comment markup is restricted and links stay safe", () => {
  const html = renderComment(
    '<p>你好 <strong>朋友</strong></p><img src="bad" onerror="alert(1)"><a href="javascript:alert(1)">坏链接</a><a href="https://example.com">网站</a>',
  );
  assert.match(html, /<strong>朋友<\/strong>/);
  assert.doesNotMatch(html, /javascript|onerror|<img/);
  assert.match(html, /nofollow noopener noreferrer/);
});
