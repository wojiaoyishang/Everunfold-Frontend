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
} from "../src/core/content-management/draft-state";
import { RequestError } from "../src/core/http/request";
import {
  createDraft,
  queryDrafts,
} from "../src/generated/content-admin-client";
import { DraftPreview } from "../src/themes/argon/admin/content/draft-preview";
import type { DraftDetail } from "../src/generated/content-admin-contract";

test("registered content types own separate entries and pages remain code-owned", () => {
  const registry = createAdminRegistry([
    builtinAdminModule,
    contentAdminModule,
  ]);
  assert.deepEqual(
    registry.navigation
      .find((group) => group.id === "content.types")
      ?.items.map((item) => item.href),
    ["/admin/content/article", "/admin/content/shuoshuo", "/admin/pages"],
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
