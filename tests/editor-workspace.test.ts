import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarDays,
  localInstant,
  dateLabel,
  sameDay,
} from "../src/core/date-time";
import {
  categoryTree,
  tagFontSize,
} from "../src/core/content-management/taxonomy-options";
import { titlePath } from "../src/core/content-management/editor-fields";
import { parsePublicSnapshot } from "../src/core/content/validation";
import { readProtectedContent } from "@/core/contracts/content-access";
import {
  contentEditHref,
  readEditAction,
} from "../src/core/content/edit-action";
import { content, snapshot } from "./fixtures";
test("editing links require the exact content and a registered editor type", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(
    contentEditHref(id, { id, type_id: "article" }),
    `/admin/content/article/${id}/edit`,
  );
  assert.equal(contentEditHref(id, { id, type_id: "page" }), null);
  assert.equal(
    contentEditHref(id, {
      id: "00000000-0000-4000-8000-000000000002",
      type_id: "article",
    }),
    null,
  );
  assert.equal(contentEditHref(id, null), null);
});
test("editing actions are private credentialed reads and denied identity is normal absence", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  for (const status of [200, 401, 403]) {
    const action = await readEditAction("https://api.example.test", id, {
      fetcher: async (url, options) => {
        const target = new URL(String(url));
        assert.equal(target.pathname, "/v1/admin/content/actions");
        assert.equal(target.searchParams.get("id"), id);
        assert.equal(options?.cache, "no-store");
        assert.equal(options?.credentials, "include");
        return Response.json(
          status === 200
            ? {
                success: true,
                code: 200,
                msg: "ok",
                data: { edit: { id, type_id: "article" } },
              }
            : { success: false, code: status, msg: "denied", data: null },
          { status },
        );
      },
    });
    assert.deepEqual(
      action,
      status === 200 ? { id, type_id: "article" } : null,
    );
  }
  await assert.rejects(
    readEditAction("https://api.example.test", id, {
      fetcher: async () => {
        throw new TypeError("offline");
      },
    }),
  );
});
test("calendar covers complete Monday-first weeks including leap days", () => {
  const days = calendarDays(2024, 1);
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(days[41].getDay(), 0);
  assert.ok(days.some((day) => sameDay(day, new Date(2024, 1, 29))));
  assert.ok(
    !calendarDays(2025, 1).some(
      (day) => day.getMonth() === 1 && day.getDate() === 29,
    ),
  );
  assert.equal(
    dateLabel(localInstant(new Date(2026, 10, 1), 14, 35)),
    "2026/11/01 14:35",
  );
});
test("category trees preserve hierarchy and tag sizes reflect real frequency", () => {
  const rows = categoryTree([
    { id: "b", name: "子分类", kind: "category", parent_id: "a", count: 3 },
    { id: "a", name: "父分类", kind: "category", count: 5 },
    {
      id: "c",
      name: "孤立分类",
      kind: "category",
      parent_id: "missing",
      count: 0,
    },
    { id: "tag", name: "标签", kind: "tag", count: 10 },
  ]);
  assert.equal(rows.find((row) => row.term.id === "b")?.depth, 1);
  assert.equal(rows.find((row) => row.term.id === "a")?.depth, 0);
  assert.ok(
    rows.findIndex((row) => row.term.id === "a") <
      rows.findIndex((row) => row.term.id === "b"),
  );
  assert.equal(rows.length, 3);
  assert.ok(tagFontSize(1, 50) < tagFontSize(25, 50));
  assert.equal(tagFontSize(50, 50), 22);
  assert.equal(tagFontSize(0, 0), 12);
});
test("new title paths have no posts prefix and preserve Chinese words", () => {
  assert.equal(titlePath("今天 散步"), "/今天-散步.html");
  assert.equal(titlePath("  “一段记录”？  "), "/一段记录.html");
  assert.equal(titlePath(""), "");
});
test("public cache rejects restricted text, media and SEO leaks", () => {
  const data = snapshot();
  data.schema_version = "0.4.0";
  const sealed = content({
    access: "password",
    content: [],
    media_urls: {},
    excerpt: "",
    word_count: 0,
    cover_url: null,
    comment_count: 0,
    seo_title: "",
    seo_description: "",
  });
  data.contents = [sealed];
  assert.equal(parsePublicSnapshot(data).contents[0].access, "password");
  for (const patch of [
    { excerpt: "secret" },
    { content: [{ id: "x", type: "markdown" as const, content: "secret" }] },
    { media_urls: { x: { original: "https://example.test/secret" } } },
    { seo_description: "secret" },
    { word_count: 100 },
  ])
    assert.throws(
      () =>
        parsePublicSnapshot({ ...data, contents: [{ ...sealed, ...patch }] }),
      /Restricted/,
    );
  assert.throws(
    () =>
      parsePublicSnapshot({
        ...data,
        contents: [{ ...sealed, access: "scheduled" }],
      }),
    /opening time/,
  );
});
test("protected reads use no-store POST and never send credentials or passwords in URLs", async () => {
  await readProtectedContent(
    "https://api.example.test",
    { id: "00000000-0000-4000-8000-000000000001", password: "test-only" },
    {
      fetcher: async (url, options) => {
        assert.equal(String(url), "https://api.example.test/v1/reader/access");
        assert.equal(options?.method, "POST");
        assert.equal(options?.cache, "no-store");
        assert.equal(options?.credentials, "omit");
        assert.equal(JSON.parse(String(options?.body)).password, "test-only");
        return Response.json({
          success: true,
          code: 200,
          msg: "ok",
          data: content({ access: "public" }),
        });
      },
    },
  );
});
