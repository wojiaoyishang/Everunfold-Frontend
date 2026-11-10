import assert from "node:assert/strict";
import test from "node:test";

import {
  matchGlossaryText,
  type GlossaryMatchTerm,
} from "@/core/glossary/match";
import { renderGlossaryContent } from "@/core/glossary/content";
import {
  clearGlossaryCache,
  loadGlossaryMatches,
} from "@/core/glossary/runtime";

function term(
  id: string,
  title: string,
  matched_texts = [title],
): GlossaryMatchTerm {
  return {
    id,
    language: "zh-CN",
    slug: id,
    title,
    summary: title,
    aliases: [],
    path: `/glossary/${id}`,
    body: [
      {
        id: `${id}-definition`,
        type: "markdown",
        content: title,
      },
    ],
    media_urls: {},
    matched_texts,
  };
}

test("glossary matching finds Chinese terms inside prose", () => {
  assert.deepEqual(
    matchGlossaryText(
      "今天遇见了金灵，她正在看云。",
      [term("jin", "金灵")],
      20,
    ),
    [
      {
        start: 5,
        end: 7,
        text: "金灵",
        term: term("jin", "金灵"),
      },
    ],
  );
});

test("glossary matching prefers longer aliases and avoids overlapping matches", () => {
  const long = term("camp", "Campfire", ["Campfire story"]);
  const short = term("fire", "Fire", ["Campfire"]);
  const matches = matchGlossaryText(
    "A campfire story begins.",
    [short, long],
    20,
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.term.id, "camp");
  assert.equal(matches[0]?.text, "campfire story");
});

test("ASCII terms do not match inside a larger word", () => {
  const matches = matchGlossaryText(
    "JSON contains json but not JS.",
    [term("js", "JS")],
    20,
  );
  assert.equal(matches.at(-1)?.text, "JS");
  assert.equal(matches.length, 1);
});

test("glossary matching honors the page-wide limit", () => {
  const matches = matchGlossaryText("金灵 金灵 金灵", [term("jin", "金灵")], 2);
  assert.equal(matches.length, 2);
});

test("article-scoped regex results honor case, boundaries and priority", () => {
  const sensitive = {
    ...term("ai", "AI"),
    matched_patterns: [
      { text: "AI", case_sensitive: true, whole_word: true, priority: 15 },
    ],
  };
  const sensitiveHits = matchGlossaryText("AI ai AIS", [sensitive], 10);
  assert.deepEqual(
    sensitiveHits.map((match) => match.text),
    ["AI"],
  );

  const partial = {
    ...term("partial", "code"),
    matched_patterns: [
      { text: "code", case_sensitive: false, whole_word: false, priority: 1 },
    ],
  };
  assert.deepEqual(
    matchGlossaryText("encode", [partial], 10).map((match) => match.text),
    ["code"],
  );
  const high = {
    ...term("high", "AI"),
    matched_patterns: [
      { text: "AI", case_sensitive: false, whole_word: true, priority: 80 },
    ],
  };
  const long = {
    ...term("long", "AI技术"),
    matched_patterns: [
      { text: "AI技术", case_sensitive: false, whole_word: true, priority: 10 },
    ],
  };
  assert.equal(
    matchGlossaryText("AI技术", [long, high], 10)[0]?.term.id,
    "high",
  );
});

test("glossary detail content uses the article rich-text renderer", () => {
  const rendered = renderGlossaryContent(
    {
      ...term("rich", "丰富词条"),
      media_urls: {
        "00000000-0000-4000-8000-000000000002": {
          original: "https://media.example.test/diagram.png",
        },
      },
      body: [
        {
          id: "rich-markdown",
          type: "markdown",
          content:
            "## 核心说明\n\n**加粗内容**\n\n- 第一项\n- 第二项\n\n> 引用\n\n`行内代码`\n\n```ts\nconst value = 1;\n```\n\n$$\na^2+b^2=c^2\n$$\n\n![示意图](site://media/00000000-0000-4000-8000-000000000002)",
        },
      ],
    },
    [],
  );
  assert.match(rendered.html, /<h2[^>]*>核心说明<\/h2>/);
  assert.match(rendered.html, /<strong>加粗内容<\/strong>/);
  assert.match(rendered.html, /<ul>/);
  assert.match(rendered.html, /<blockquote>/);
  assert.match(rendered.html, /<code>行内代码<\/code>/);
  assert.match(rendered.html, /language-typescript/);
  assert.match(rendered.html, /diagram\.png/);
  assert.equal(rendered.features.code, true);
  assert.equal(rendered.features.math, true);
});

test("glossary rich content falls back to a safe summary when the body is blank", () => {
  const rendered = renderGlossaryContent({
    ...term("fallback", "回退词条"),
    summary: "**简短提示**",
    body: [
      {
        id: "blank",
        type: "html",
        content: "   ",
      },
    ],
  });
  assert.match(rendered.html, /<strong>简短提示<\/strong>/);

  const sanitized = renderGlossaryContent({
    ...term("safe", "安全词条"),
    body: [
      {
        id: "unsafe",
        type: "html",
        content: "<script>alert(1)</script><p>保留安全正文</p>",
      },
    ],
  });
  assert.doesNotMatch(sanitized.html, /<script|alert\(1\)/);
  assert.match(sanitized.html, /保留安全正文/);
});

test("empty article matches are cached alongside the article revision", async () => {
  clearGlossaryCache();
  const contentId = "00000000-0000-4000-8000-000000000001";
  let requests = 0;
  const fetcher = (() => {
    requests += 1;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          code: 200,
          msg: "OK",
          data: {
            content_id: contentId,
            revision: "revision-1",
            terms: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }) as typeof fetch;

  const first = await loadGlossaryMatches(
    "https://api.example.test",
    contentId,
    "revision-1",
    { fetcher },
  );
  const second = await loadGlossaryMatches(
    "https://api.example.test",
    contentId,
    "revision-1",
    { fetcher },
  );

  assert.deepEqual(first.terms, []);
  assert.strictEqual(second, first);
  assert.equal(requests, 1);
  clearGlossaryCache();
});
