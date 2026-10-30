import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommentBody } from "../src/themes/argon/components/comments/comment-body";
import {
  commentPage,
  commentPageFor,
  historicalComments,
  insertCommentText,
  orderComments,
  validateDraft,
  type CommentDraft,
  type CommentEntry,
} from "../src/themes/argon/components/comments/model";

const entry = (
  id: string,
  seconds: number,
  parentId: string | null = null,
): CommentEntry => ({
  id,
  parentId,
  author: "访客",
  body: "正文",
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString(),
  origin: "history",
  format: "plain",
});
const draft: CommentDraft = {
  author: "访客",
  body: "你好",
  email: "",
  website: "",
  formatted: true,
};

test("comments retain global chronology rather than grouping replies into threads", () => {
  const source = [
    entry("reply", 2, "a"),
    entry("b", 1),
    entry("a", 0),
    entry("nested", 3, "reply"),
  ];
  const sorted = orderComments(source);
  assert.deepEqual(
    sorted.map((item) => item.id),
    ["a", "b", "reply", "nested"],
  );
  assert.equal(sorted[3].parentId, "reply");
  assert.equal(source[0].id, "reply");
  assert.deepEqual(
    orderComments([entry("b", 1), entry("a", 1)]).map((item) => item.id),
    ["a", "b"],
  );
});

test("reply lookup finds the correct page and missing parents remain unresolved", () => {
  const entries = Array.from({ length: 14 }, (_, i) => entry(`id-${i}`, i));
  assert.equal(commentPageFor(entries, "id-6"), 2);
  assert.equal(commentPageFor(entries, "missing"), null);
  assert.equal(commentPage(entries, 2).entries[0].id, "id-6");
  assert.equal(commentPage(entries, 99).page, 3);
  assert.deepEqual(commentPage([], -1), { page: 1, pages: 1, entries: [] });
});

test("historical text stays plain while preview formatting never executes HTML", () => {
  const raw = '<img src=x onerror="bad()"> **原文** &lt;b&gt;';
  const [history] = historicalComments([
    {
      id: "old",
      author: "访客",
      parent_id: null,
      content: raw,
      created_at: "2026-01-01T00:00:00Z",
    },
  ]);
  assert.equal(history.body, raw);
  assert.equal(history.format, "plain");
  const plain = renderToStaticMarkup(
    createElement(CommentBody, { body: history.body, formatted: false }),
  );
  assert.ok(plain.includes("**原文**"));
  assert.ok(plain.includes("&amp;lt;b&amp;gt;"));
  const formatted = renderToStaticMarkup(
    createElement(CommentBody, {
      body: `${raw}\n> 引用\n\`<script>bad()</script>\`\n**\n\``,
      formatted: true,
    }),
  );
  assert.ok(formatted.includes("<strong>原文</strong>"));
  assert.ok(formatted.includes("<blockquote>引用</blockquote>"));
  assert.ok(formatted.includes("<p>**</p>"));
  assert.doesNotMatch(formatted, /<img|<script|onerror="/);
});

test("draft validation refuses empty content, overlong fields and unsafe profile URLs", () => {
  assert.deepEqual(validateDraft(draft), {});
  assert.ok(validateDraft({ ...draft, body: "  " }).body);
  assert.ok(validateDraft({ ...draft, author: "a".repeat(41) }).author);
  assert.ok(validateDraft({ ...draft, body: "a".repeat(2001) }).body);
  for (const website of [
    "javascript:alert(1)",
    "//example.com",
    "https://name:secret@example.com",
  ])
    assert.ok(validateDraft({ ...draft, website }).website);
  assert.ok(validateDraft({ ...draft, email: "bad-address" }).email);
  assert.deepEqual(
    validateDraft({
      ...draft,
      email: "reader@example.test",
      website: "https://example.com/",
    }),
    {},
  );
});

test("editor insertion preserves selection and refuses to silently truncate a full draft", () => {
  assert.deepEqual(insertCommentText("你好世界", 2, 4, "**", "**"), {
    text: "你好**世界**",
    start: 4,
    end: 6,
  });
  assert.deepEqual(insertCommentText("", 0, 0, "`", "`", "code"), {
    text: "`code`",
    start: 1,
    end: 5,
  });
  assert.equal(insertCommentText("a".repeat(2000), 2000, 2000, "✨"), null);
});
