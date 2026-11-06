/* Generated from the backend public contract. Do not edit by hand. */

export type SchemaVersion =
  "0.1.0" | "0.2.0" | "0.3.0" | "0.4.0" | "0.5.0" | "0.6.0" | "0.7.0";
export type Original = string;
export type Webp = string;
export type Family = string;
export type Style = "normal" | "italic";
export type WeightMin = number;
export type WeightMax = number;
export type Format = "woff2" | "woff" | "truetype" | "opentype";
export type TranslationGroupId = string | null;
export type Id = string;
export type Language = string;
export type Path = string;
export type Access = "public" | "password" | "scheduled";
export type IsOriginal = boolean;
export type Translations = ContentTranslation[];
export type Title = string;
export type Path1 = string;
export type Description = string;
export type AllowIndexing = boolean;
export type Enabled = true;
export type Html = string;
export type Css = string;
export type Javascript = string;
export type JavascriptEnabled = boolean;
export type JsonValue = unknown;
export type Id1 = string;
export type Source = "custom" | "registered";
export type ImplementationId = string | null;
export type ImplementationVersion = string | null;
export type Revision = number;

/**
 * 公开阅读快照 0.7；加入已应用的独立页面，兼容已有快照。
 */
export interface PublicSnapshot {
  schema_version: SchemaVersion;
  source_epoch: string;
  generation: number;
  exported_at: string;
  site: Site;
  contents: ContentDetail[];
  comments: {
    [k: string]: PublicComment[];
  };
  taxonomies: Taxonomy[];
  pages?: PublicManagedPage[];
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
  kind: "article" | "shuoshuo" | "page";
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
    [k: string]: MediaURL;
  };
  comments_open?: boolean;
  seo_title?: string;
  seo_description?: string;
  access?: "public" | "password" | "scheduled";
  opens_at?: string | null;
  translation_group_id?: TranslationGroupId;
  translations?: Translations;
}
export interface Taxonomy {
  id: string;
  slug: string;
  name: string;
  kind: "category" | "tag";
  count: number;
}
export interface MediaURL {
  original: Original;
  webp?: Webp;
  font?: FontInfo | null;
}
export interface FontInfo {
  family: Family;
  style: Style;
  weight_min: WeightMin;
  weight_max: WeightMax;
  format: Format;
}
export interface ContentTranslation {
  id: Id;
  language: Language;
  path: Path;
  access?: Access;
  is_original?: IsOriginal;
}
export interface PublicComment {
  id: string;
  parent_id: string | null;
  author: string;
  /**
   * 纯文本，按文本展示，不再作为 HTML 解析
   */
  content: string;
  created_at: string;
  reply_to?: string | null;
}
export interface PublicManagedPage {
  title: Title;
  path: Path1;
  description?: Description;
  allow_indexing?: AllowIndexing;
  enabled?: Enabled;
  html?: Html;
  css?: Css;
  javascript?: Javascript;
  javascript_enabled?: JavascriptEnabled;
  options?: Options;
  id: Id1;
  source: Source;
  implementation_id?: ImplementationId;
  implementation_version?: ImplementationVersion;
  revision: Revision;
}
export interface Options {
  [k: string]: JsonValue;
}
