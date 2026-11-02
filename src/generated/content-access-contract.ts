/* Generated from the backend public contract. Do not edit by hand. */

export type Id = string;
export type Password = string;
export type Success = boolean;
export type Code = number;
export type Msg = string;
export type CommentsOpen = boolean;
export type SeoTitle = string;
export type SeoDescription = string;
export type Access = "public" | "password" | "scheduled";
export type OpensAt = string | null;
export type Id1 = string;
export type Kind = "article" | "shuoshuo" | "page";
export type Title = string;
export type Path = string;
export type Excerpt = string;
export type Language = string;
export type PublishedAt = string;
export type UpdatedAt = string;
export type Author = string;
export type CoverUrl = string | null;
export type ReadingMinutes = number;
export type WordCount = number;
export type Id2 = string;
export type Slug = string;
export type Name = string;
export type Kind1 = "category" | "tag";
export type Count = number;
export type Categories = TaxonomyDTO[];
export type Tags = TaxonomyDTO[];
export type CommentCount = number;
export type Pinned = boolean;
export type Id3 = string;
export type Type = "markdown" | "html";
export type Content1 = string;
export type Content = ContentBlock[];
export type Original = string;
export type Webp = string;

export interface ContentAccessContract {
  request: ContentAccessInput;
  response: PublicResponseContentDetail;
}
export interface ContentAccessInput {
  id: Id;
  password?: Password;
}
export interface PublicResponseContentDetail {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: ContentDetail;
}
export interface ContentDetail {
  comments_open?: CommentsOpen;
  seo_title?: SeoTitle;
  seo_description?: SeoDescription;
  access?: Access;
  opens_at?: OpensAt;
  id: Id1;
  kind: Kind;
  title: Title;
  path: Path;
  excerpt: Excerpt;
  language: Language;
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
}
export interface TaxonomyDTO {
  id: Id2;
  slug: Slug;
  name: Name;
  kind: Kind1;
  count: Count;
}
export interface ContentBlock {
  id: Id3;
  type: Type;
  content: Content1;
}
export interface MediaUrls {
  [k: string]: MediaURL;
}
export interface MediaURL {
  original: Original;
  webp?: Webp;
}
