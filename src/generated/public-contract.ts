/* Generated from the backend public contract. Do not edit by hand. */

/**
 * Everunfold 0.1.0 公开阅读快照；仅含已发布公开内容，不是完整 ICP 协议。
 */
export interface PublicSnapshot {
  schema_version: "0.1.0";
  source_epoch: string;
  generation: number;
  exported_at: string;
  site: Site;
  contents: ContentDetail[];
  comments: {
    [k: string]: PublicComment[];
  };
  taxonomies: Taxonomy[];
}
export interface Site {
  name: string;
  description: string;
  author: string;
  avatar_url: string | null;
  hero_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  notice: string;
  navigation: {
    label: string;
    href: string;
    icon?: string;
  }[];
  stats: {
    articles: number;
    pages: number;
    comments: number;
    tags: number;
    categories: number;
  };
}
export interface ContentDetail {
  id: string;
  kind: "article" | "page";
  title: string;
  path: string;
  excerpt: string;
  language: string;
  published_at: string;
  updated_at: string;
  author: string;
  cover_url: string | null;
  reading_minutes: number;
  word_count: number;
  categories: Taxonomy[];
  tags: Taxonomy[];
  comment_count: number;
  pinned: boolean;
  content: {
    id: string;
    type: "markdown" | "html";
    content: string;
  }[];
  media_urls: {
    [k: string]: {
      original: string;
      webp?: string;
    };
  };
}
export interface Taxonomy {
  id: string;
  slug: string;
  name: string;
  kind: "category" | "tag";
  count: number;
}
export interface PublicComment {
  id: string;
  parent_id: string | null;
  author: string;
  content: string;
  created_at: string;
  reply_to?: string | null;
}
