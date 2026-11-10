import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  contentAdminModule,
  registeredContentTypes,
} from "../src/core/content-management/registry";
import { createAdminRegistry } from "../src/core/admin/registry";
import { builtinAdminModule } from "../src/core/admin/builtin-module";
import {
  draftError,
  draftFields,
  uncertainWrite,
  validateDraft,
  validatePublicationTime,
} from "../src/core/content-management/draft-state";
import { RequestError } from "../src/core/http/request";
import { createDraft, queryDrafts } from "@/core/contracts/content-admin";
import { DraftPreview } from "../src/themes/argon/admin/content/draft-preview";
import type { DraftDetail } from "@/core/contracts/content-admin";
import {
  moveBlock,
  parseEditorDate,
  formatEditorDate,
  mediaMarkup,
} from "../src/core/content-management/editor-fields";
import { contentMetadata } from "../src/core/content/metadata";
import { presentLegacyContent } from "../src/core/content/presentation";
import type { Content } from "../src/core/content/types";

test("registered content types own separate entries and pages remain code-owned", () => {
  const registry = createAdminRegistry([
    builtinAdminModule,
    contentAdminModule,
  ]);
  assert.deepEqual(
    registry.navigation
      .find((group) => group.id === "content.types")
      ?.items.map((item) => item.href),
    [
      "/admin/content/article",
      "/admin/content/shuoshuo",
      "/admin/pages",
      "/admin/taxonomies",
    ],
  );
  assert.deepEqual(
    registry.navigation
      .find((group) => group.id === "core.tools")
      ?.items.map((item) => item.href),
    ["/admin/glossary", "/admin/shortcodes"],
  );
  assert.equal(registry.resolve("/admin/content/article")?.label, "文章");
  assert.equal(registry.page("core.content")?.menu, null);
  assert.ok(!registeredContentTypes.find((type) => type.id === "page"));
});

const detail: DraftDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  type_id: "article",
  title: "Sample",
  excerpt: "Summary",
  preview: "Text",
  author: "admin",
  revision: 2,
  status: "draft",
  is_demo: false,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  body: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      type: "markdown",
      content: "Text",
    },
  ],
};
test("scheduled publication requires a valid future instant, independent of display dates", () => {
  assert.equal(validatePublicationTime(null), "请选择定时发布时间。");
  assert.equal(validatePublicationTime("invalid"), "请选择定时发布时间。");
  assert.equal(
    validatePublicationTime("2020-01-01T00:00:00Z"),
    "请选择晚于当前时间的定时发布时间。",
  );
  assert.equal(
    validatePublicationTime(new Date(Date.now() + 3600000).toISOString()),
    "",
  );
  const fields = draftFields(detail);
  fields.settings = { display_published_at: "2020-01-01T00:00:00Z" };
  assert.equal(validateDraft(fields, registeredContentTypes[0]), "");
});
test("editing preserves stable block identity and registered title requirements", () => {
  const fields = draftFields(detail);
  assert.equal(fields.body[0].id, detail.body[0].id);
  fields.body[0].content = "changed";
  assert.equal(detail.body[0].content, "Text");
  const empty = draftFields();
  assert.ok(validateDraft(empty, registeredContentTypes[0]));
  assert.equal(validateDraft(empty, registeredContentTypes[1]), "");
  assert.notEqual(draftFields().body[0].id, empty.body[0].id);
  assert.match(draftError(new RequestError("http", 409, 40951)), /输入已保留/);
  assert.equal(uncertainWrite(new RequestError("timeout")), true);
  assert.equal(uncertainWrite(new RequestError("http", 503)), true);
  assert.equal(uncertainWrite(new RequestError("http", 409, 40951)), false);
});

test("editor properties are copied independently and block movement never replaces IDs", () => {
  const source = {
    ...detail,
    settings: { categories: ["日常"], comments_open: false },
  };
  const fields = draftFields(source);
  fields.settings!.categories!.push("测试");
  assert.deepEqual(source.settings.categories, ["日常"]);
  const body = [
    ...fields.body,
    { id: crypto.randomUUID(), type: "html" as const, content: "<p>HTML</p>" },
  ];
  const moved = moveBlock(body, body[1].id, -1);
  assert.equal(moved[0], body[1]);
  assert.equal(moved[1], body[0]);
  assert.equal(moveBlock(body, body[0].id, -1), body);
  assert.equal(moveBlock(body, "missing", 1), body);
});

test("local display dates round-trip and incomplete/invalid input cannot be saved", () => {
  const valid = parseEditorDate("2026-11-02 14:30");
  assert.equal(formatEditorDate(valid), "2026-11-02 14:30");
  assert.equal(parseEditorDate(""), null);
  for (const input of ["2026-02-30 12:00", "2026-11-02 25:00", "2026-11-"]) {
    assert.equal(parseEditorDate(input), input);
    assert.match(
      validateDraft(
        {
          ...draftFields(detail),
          settings: { display_published_at: parseEditorDate(input) },
        },
        registeredContentTypes[0],
      ),
      /有效/,
    );
  }
});

test("mixed block preview resolves stable media references and sanitizes HTML", () => {
  const id = crypto.randomUUID();
  const item = {
    id: `media:${id}`,
    label: "picture.png",
    url: "https://cdn.example.test/image.png",
    kind: "image" as const,
    mime: "image/png",
    size: 1,
    created_at: "2026-01-01T00:00:00Z",
  };
  const html = renderToStaticMarkup(
    React.createElement(DraftPreview, {
      fields: {
        body: [
          {
            id: crypto.randomUUID(),
            type: "markdown",
            content: mediaMarkup(item, "markdown", "示例"),
          },
          {
            id: crypto.randomUUID(),
            type: "html",
            content:
              '<p>第二块</p><script>alert(1)</script><img onerror="alert(1)">',
          },
        ],
      },
      media: { [id]: { original: item.url } },
    }),
  );
  assert.ok(html.includes(item.url));
  assert.ok(html.includes("第二块"));
  assert.ok(!html.includes("onerror"));
  assert.ok(!html.includes("<script"));
  assert.match(mediaMarkup(item, "html", '\"<script>'), /&quot;&lt;script&gt;/);
});

test("published editor properties reach presentation and search metadata", () => {
  const source: Content = {
    id: "test",
    kind: "article",
    title: "内容标题",
    path: "/posts/test.html",
    excerpt: "正文摘要",
    language: "zh",
    published_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    author: "admin",
    cover_url: null,
    reading_minutes: 1,
    word_count: 1,
    categories: [],
    tags: [],
    comment_count: 0,
    pinned: true,
    content: [],
    media_urls: {},
    comments_open: false,
    seo_title: "搜索标题",
    seo_description: "搜索描述",
  };
  const view = presentLegacyContent(source);
  assert.equal(view.comments_open, false);
  const metadata = contentMetadata(view, "Test", "https://example.test");
  assert.equal(metadata.title, "搜索标题");
  assert.equal(metadata.description, "搜索描述");
});

test("generated draft calls carry private credentials, CSRF, stable operation and revision payload", async () => {
  const request = {
    type_id: "article",
    operation_id: crypto.randomUUID(),
    fields: draftFields(detail),
  };
  const response = await createDraft(
    "http://api.example.test",
    request,
    "csrf",
    {
      fetcher: async (url, options) => {
        assert.equal(
          String(url),
          "http://api.example.test/v1/admin/content/create",
        );
        assert.equal(options?.credentials, "include");
        assert.equal(options?.cache, "no-store");
        assert.equal(new Headers(options?.headers).get("X-CSRF-Token"), "csrf");
        assert.deepEqual(JSON.parse(String(options?.body)), request);
        return Response.json({
          success: true,
          code: 200,
          msg: "ok",
          data: detail,
        });
      },
    },
  );
  assert.equal(response.data.id, detail.id);
  await assert.rejects(
    queryDrafts("http://api.example.test", { type_id: "article" }, "csrf", {
      fetcher: async () =>
        Response.json({ success: true, data: { items: [detail] } }),
    }),
    RequestError,
  );
});

test("editor preview shares safe Markdown rendering without executing input markup", () => {
  const html = renderToStaticMarkup(
    React.createElement(DraftPreview, {
      fields: {
        title: "<script>title</script>",
        body: [
          {
            id: crypto.randomUUID(),
            content:
              "## Heading\n\n**Bold**<script>alert(1)</script>\n\n[bad](javascript:alert(1))",
          },
        ],
      },
    }),
  );
  assert.ok(html.includes("<strong>Bold</strong>"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript:'));
});
