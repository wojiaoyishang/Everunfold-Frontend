/* Generated from the backend public contract. Do not edit by hand. */

export type Id = string;
export type Type = "article" | "shuoshuo" | "page";
export type Title = string;
export type Path = string;
export type Excerpt = string;
export type Language = string;
export type TranslationGroupId = string | null;
export type Id1 = string;
export type Language1 = string;
export type Path1 = string;
export type Access = "public" | "password" | "scheduled";
export type IsOriginal = boolean;
export type Translations = ContentTranslation[];
export type PublishedAt = string;
export type UpdatedAt = string;
export type Author = string;
export type CoverUrl = string | null;
export type ReadingMinutes = number;
export type WordCount = number;
export type Id2 = string;
export type Slug = string;
export type Name = string;
export type Kind = "category" | "tag";
export type Count = number;
export type Categories = TaxonomyDTO[];
export type Tags = TaxonomyDTO[];
export type CommentCount = number;
export type Pinned = boolean;
export type Id3 = string;
export type Type1 = "markdown" | "html";
export type Content1 = string;
export type Content = ContentBlock[];
export type Original = string;
export type Webp = string;
export type Family = string;
export type Style = "normal" | "italic";
export type WeightMin = number;
export type WeightMax = number;
export type Format = "woff2" | "woff" | "truetype" | "opentype";
export type CommentsOpen = boolean;
export type SeoTitle = string;
export type SeoDescription = string;
export type ReactionCount = number;
export type Access1 = "public" | "password" | "scheduled";
export type OpensAt = string | null;

/**
 * Draft presentation contract. No HTTP endpoint or database migration is installed. Locked records omit body, excerpt and media. Viewer-specific state is separate.
 */
export interface ContentPresentation {
  id: Id;
  type: Type;
  title: Title;
  path: Path;
  excerpt: Excerpt;
  language: Language;
  translation_group_id?: TranslationGroupId;
  translations?: Translations;
  published_at: PublishedAt;
  updated_at: UpdatedAt;
  author: Author;
  cover_url: CoverUrl;
  reading_minutes: ReadingMinutes;
  word_count: WordCount;
  categories: Categories;
  tags: Tags;
  comment_count: CommentCount;
  pinned: Pinned;
  content: Content;
  media_urls: MediaUrls;
  comments_open: CommentsOpen;
  seo_title?: SeoTitle;
  seo_description?: SeoDescription;
  reaction_count: ReactionCount;
  access: Access1;
  opens_at: OpensAt;
}
export interface ContentTranslation {
  id: Id1;
  language: Language1;
  path: Path1;
  access?: Access;
  is_original?: IsOriginal;
}
export interface TaxonomyDTO {
  id: Id2;
  slug: Slug;
  name: Name;
  kind: Kind;
  count: Count;
}
export interface ContentBlock {
  id: Id3;
  type: Type1;
  content: Content1;
}
export interface MediaUrls {
  [k: string]: MediaURL;
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
