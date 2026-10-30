import type {
  Content,
  PublicSnapshot,
  Taxonomy,
} from "../src/core/content/types";

export const category: Taxonomy = {
  id: "category-1",
  slug: "notes",
  name: "随笔",
  kind: "category",
  count: 2,
};
export const tag: Taxonomy = {
  id: "tag-1",
  slug: "code",
  name: "代码",
  kind: "tag",
  count: 1,
};

export function content(overrides: Partial<Content> = {}): Content {
  return {
    id: "article-1",
    kind: "article",
    title: "一篇文章",
    path: "/hello.html",
    excerpt: "一段摘要",
    language: "zh-CN",
    published_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
    author: "作者",
    cover_url: null,
    reading_minutes: 1,
    word_count: 20,
    categories: [category],
    tags: [tag],
    comment_count: 0,
    pinned: false,
    content: [{ id: "block-1", type: "markdown", content: "## 标题\n正文" }],
    media_urls: {},
    ...overrides,
  };
}

export function snapshot(): PublicSnapshot {
  return {
    schema_version: "0.1.0",
    source_epoch: "test-source",
    generation: 1,
    exported_at: "2026-10-30T00:00:00Z",
    site: {
      name: "测试站点",
      description: "仅供测试",
      author: "作者",
      avatar_url: null,
      hero_url: null,
      hero_title: "测试站点",
      hero_subtitle: "仅供测试",
      notice: "",
      navigation: [],
      stats: { articles: 2, pages: 1, comments: 0, tags: 1, categories: 1 },
    },
    contents: [
      content(),
      content({
        id: "article-2",
        title: "新文章",
        path: "/second.html",
        published_at: "2026-10-03T00:00:00Z",
        tags: [],
        content: [{ id: "block-2", type: "html", content: "<p>不同正文</p>" }],
      }),
      content({
        id: "page-1",
        kind: "page",
        title: "关于",
        path: "/about.html",
      }),
    ],
    comments: {},
    taxonomies: [category, tag],
  };
}
