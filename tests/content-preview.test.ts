import assert from "node:assert/strict";
import test from "node:test";
import type { DraftDetail } from "../src/generated/content-admin-contract";
import {
  contentPreviewPath,
  isContentPreviewPath,
  previewContent,
} from "../src/core/content-management/preview";
import { isManagementRoute, loginReturnPath } from "../src/core/auth/routes";
import {
  checkedLiveContent,
  editorPreviewContent,
} from "../src/core/preview/content";
import { renderContent } from "../src/core/rendering/content";

const id = "00000000-0000-4000-8000-000000000001";
const mediaId = "00000000-0000-4000-8000-000000000002";
function draft(): DraftDetail {
  return {
    id,
    type_id: "article",
    title: "尚未发布的标题",
    excerpt: "摘要",
    preview: "摘要",
    author: "作者",
    revision: 3,
    status: "draft",
    is_demo: false,
    published_revision: null,
    public_path: null,
    published_at: null,
    created_at: "2026-11-04T00:00:00Z",
    updated_at: "2026-11-04T01:00:00Z",
    body: [{ id, type: "markdown", content: "# 标题\n\n$\\alpha$ 🌟" }],
    settings: {
      visibility: "password",
      opens_at: "2026-12-01T00:00:00Z",
      categories: ["分类"],
      tags: ["新标签"],
      cover_media_id: mediaId,
    },
    media_urls: { [mediaId]: { original: "https://files.example/cover.png" } },
    has_password: true,
  };
}

test("content previews are explicit private routes with safe login returns", () => {
  for (const type of ["article", "shuoshuo"]) {
    const path = contentPreviewPath(type, id);
    assert.equal(isContentPreviewPath(path), true);
    assert.equal(isManagementRoute(path), true);
    assert.equal(loginReturnPath(path), path);
  }
  for (const path of [
    `/admin/content/page/${id}/preview`,
    `/admin/content/article/missing/preview`,
    `/admin/content/article/${id}/preview/unknown`,
  ]) {
    assert.equal(isContentPreviewPath(path), false);
    assert.equal(isManagementRoute(path), false);
  }
  assert.throws(() => contentPreviewPath("../../", id));
});

test("authorized preview projects only display fields and keeps restricted source intact", () => {
  const source = draft();
  const content = previewContent(source, [
    {
      id: "category-id",
      kind: "category",
      slug: "category",
      name: "分类",
      count: 4,
    },
  ]);
  assert.deepEqual(content.content, source.body);
  assert.equal(content.access, "scheduled");
  assert.equal(content.opens_at, source.settings?.opens_at);
  assert.equal(content.cover_url, source.media_urls?.[mediaId].original);
  assert.equal(content.categories[0].id, "category-id");
  assert.equal(content.tags[0].name, "新标签");
  assert.equal(content.word_count, Array.from(source.body[0].content).length);
  assert.equal(content.published_at, source.created_at);
  assert.equal("has_password" in content, false);
  assert.equal("access_password" in content, false);
  assert.equal("published_revision" in content, false);
  assert.equal(source.published_revision, null);
});

test("draft preview reuses safe content rendering and conditional feature detection", () => {
  const source = draft();
  source.body.push({
    id: mediaId,
    type: "html",
    content:
      '<script>alert(1)</script><img src="site://media/' +
      mediaId +
      '"><pre><code class="language-python">print(42)</code></pre>',
  });
  const result = renderContent(previewContent(source, []));
  assert.equal(result.features.math, true);
  assert.equal(result.features.code, true);
  assert.doesNotMatch(result.html, /<script|alert\(1\)/);
  assert.match(result.html, /https:\/\/files.example\/cover.png/);
  assert.equal(source.published_revision, null);
});

test("embedded live content uses the current draft projection without sending its password", () => {
  const source = draft();
  const fields = {
    title: "即时标题",
    body: [{ id, type: "markdown" as const, content: "即时正文" }],
    settings: source.settings,
    access_password: "private-do-not-forward",
  };
  const content = editorPreviewContent(source, fields, source.media_urls ?? {});
  assert.equal(content.title, "即时标题");
  assert.equal(content.content[0].content, "即时正文");
  assert.doesNotMatch(
    JSON.stringify(content),
    /private-do-not-forward|access_password/,
  );
  assert.ok(checkedLiveContent(content, "article", id));
  assert.equal(checkedLiveContent(content, "shuoshuo", id), null);
  assert.equal(checkedLiveContent(content, "article", mediaId), null);
  assert.equal(
    checkedLiveContent({ ...content, author: undefined }, "article", id),
    null,
  );
});
