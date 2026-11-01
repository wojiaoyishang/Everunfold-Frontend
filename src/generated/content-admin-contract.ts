/* Generated from the backend public contract. Do not edit by hand. */

export type TypeId = string;
export type Search = string;
export type Status = "all" | "draft" | "published" | "trash";
export type Page = number;
export type PageSize = number;
export type Id = string;
export type OperationId = string;
export type TypeId1 = string;
export type Title = string;
export type Excerpt = string;
export type Id1 = string;
export type Type = "markdown";
export type Content = string;
/**
 * @minItems 1
 * @maxItems 128
 */
export type Body = DraftBlock[];
export type Id2 = string;
export type OperationId1 = string;
export type ExpectedRevision = number;
export type Id3 = string;
export type OperationId2 = string;
export type ExpectedRevision1 = number;
export type Success = boolean;
export type Code = number;
export type Msg = string;
export type Id4 = string;
export type TypeId2 = string;
export type Title1 = string;
export type Excerpt1 = string;
export type Preview = string;
export type Author = string;
export type Revision = number;
export type Status1 = "draft" | "trash";
export type IsDemo = boolean;
export type PublishedRevision = number | null;
export type PublicPath = string | null;
export type PublishedAt = string | null;
export type CreatedAt = string;
export type UpdatedAt = string;
export type Items = DraftSummary[];
export type Total = number;
export type Page1 = number;
export type PageSize1 = number;
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type Id5 = string;
export type TypeId3 = string;
export type Title2 = string;
export type Excerpt2 = string;
export type Preview1 = string;
export type Author1 = string;
export type Revision1 = number;
export type Status2 = "draft" | "trash";
export type IsDemo1 = boolean;
export type PublishedRevision1 = number | null;
export type PublicPath1 = string | null;
export type PublishedAt1 = string | null;
export type CreatedAt1 = string;
export type UpdatedAt1 = string;
export type Body1 = DraftBlock[];
export type Success2 = boolean;
export type Code2 = number;
export type Msg2 = string;
export type Id6 = string;
export type Owner = string;
export type Label = string;
export type Description = string;
export type Icon = string;
export type Order = number;
export type TitleRequired = boolean;
export type SupportsExcerpt = boolean;
export type Editor = string;
export type Items1 = ContentTypeDefinition[];
export type Success3 = boolean;
export type Code3 = number;
export type Msg3 = string;
export type SourceEpoch = string;
export type Revision2 = number;
export type NodeId = string;
export type Enabled = boolean;
export type DesiredRevision = number;
export type AppliedRevision = number | null;
export type Status3 = "not_configured" | "pending" | "applied" | "failed";
export type AppliedAt = string | null;
export type Error = string | null;
export type Delivery = DeliveryState[];
export type Protocol = "content-1";
export type NodeId1 = string;
export type SourceEpoch1 = string;
export type Resource = "public-content";
export type Revision3 = number;
export type SchemaVersion = "0.1.0" | "0.2.0";
export type SourceEpoch2 = string;
export type Generation = number;
export type ExportedAt = string;
export type Name = string;
export type Description1 = string;
export type Author2 = string;
export type AvatarUrl = string | null;
export type HeroUrl = string | null;
export type HeroTitle = string;
export type HeroSubtitle = string;
export type Notice = string;
export type Label1 = string;
export type Href = string;
export type Icon1 = string;
export type Navigation = NavigationItem[];
export type Articles = number;
export type Pages = number;
export type Comments = number;
export type Tags = number;
export type Categories = number;
export type Id7 = string;
export type Kind = "article" | "shuoshuo" | "page";
export type Title3 = string;
export type Path = string;
export type Excerpt3 = string;
export type Language = string;
export type PublishedAt2 = string;
export type UpdatedAt2 = string;
export type Author3 = string;
export type CoverUrl = string | null;
export type ReadingMinutes = number;
export type WordCount = number;
export type Id8 = string;
export type Slug = string;
export type Name1 = string;
export type Kind1 = "category" | "tag";
export type Count = number;
export type Categories1 = TaxonomyDTO[];
export type Tags1 = TaxonomyDTO[];
export type CommentCount = number;
export type Pinned = boolean;
export type Id9 = string;
export type Type1 = "markdown" | "html";
export type Content2 = string;
export type Content1 = ContentBlock[];
export type Original = string;
export type Webp = string;
export type Contents = ContentDetail[];
export type Id10 = string;
export type ParentId = string | null;
export type Author4 = string;
/**
 * 纯文本，按文本展示，不再作为 HTML 解析
 */
export type Content3 = string;
export type CreatedAt2 = string;
export type ReplyTo = string | null;
export type Taxonomies = TaxonomyDTO[];

export interface ContentAdminContract {
  query: DraftQuery;
  lookup: DraftLookup;
  create: DraftCreate;
  save: DraftSave;
  mutation: DraftMutation;
  catalog: PublicResponseDraftCatalog;
  detail: PublicResponseDraftDetail;
  types: PublicResponseContentTypeCatalog;
  sync_state: PublicResponseContentSyncState;
  delivery: ContentDelivery;
}
export interface DraftQuery {
  type_id: TypeId;
  search?: Search;
  status?: Status;
  page?: Page;
  page_size?: PageSize;
}
export interface DraftLookup {
  id: Id;
}
export interface DraftCreate {
  operation_id: OperationId;
  type_id: TypeId1;
  fields: DraftFields;
}
export interface DraftFields {
  title?: Title;
  excerpt?: Excerpt;
  body: Body;
}
export interface DraftBlock {
  id: Id1;
  type?: Type;
  content: Content;
}
export interface DraftSave {
  id: Id2;
  operation_id: OperationId1;
  expected_revision: ExpectedRevision;
  fields: DraftFields;
}
export interface DraftMutation {
  id: Id3;
  operation_id: OperationId2;
  expected_revision: ExpectedRevision1;
}
export interface PublicResponseDraftCatalog {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: DraftCatalog;
}
export interface DraftCatalog {
  items: Items;
  total: Total;
  page: Page1;
  page_size: PageSize1;
}
export interface DraftSummary {
  id: Id4;
  type_id: TypeId2;
  title: Title1;
  excerpt: Excerpt1;
  preview: Preview;
  author: Author;
  revision: Revision;
  status: Status1;
  is_demo: IsDemo;
  published_revision?: PublishedRevision;
  public_path?: PublicPath;
  published_at?: PublishedAt;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}
export interface PublicResponseDraftDetail {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: DraftDetail;
}
export interface DraftDetail {
  id: Id5;
  type_id: TypeId3;
  title: Title2;
  excerpt: Excerpt2;
  preview: Preview1;
  author: Author1;
  revision: Revision1;
  status: Status2;
  is_demo: IsDemo1;
  published_revision?: PublishedRevision1;
  public_path?: PublicPath1;
  published_at?: PublishedAt1;
  created_at: CreatedAt1;
  updated_at: UpdatedAt1;
  body: Body1;
}
export interface PublicResponseContentTypeCatalog {
  success?: Success2;
  code?: Code2;
  msg?: Msg2;
  data: ContentTypeCatalog;
}
export interface ContentTypeCatalog {
  items: Items1;
}
export interface ContentTypeDefinition {
  id: Id6;
  owner: Owner;
  label: Label;
  description: Description;
  icon: Icon;
  order: Order;
  title_required: TitleRequired;
  supports_excerpt: SupportsExcerpt;
  editor: Editor;
}
export interface PublicResponseContentSyncState {
  success?: Success3;
  code?: Code3;
  msg?: Msg3;
  data: ContentSyncState;
}
export interface ContentSyncState {
  source_epoch: SourceEpoch;
  revision: Revision2;
  delivery: Delivery;
}
export interface DeliveryState {
  node_id: NodeId;
  enabled: Enabled;
  desired_revision: DesiredRevision;
  applied_revision: AppliedRevision;
  status: Status3;
  applied_at: AppliedAt;
  error: Error;
}
export interface ContentDelivery {
  protocol?: Protocol;
  node_id: NodeId1;
  source_epoch: SourceEpoch1;
  resource?: Resource;
  revision: Revision3;
  value: PublicSnapshot;
}
export interface PublicSnapshot {
  schema_version?: SchemaVersion;
  source_epoch: SourceEpoch2;
  generation: Generation;
  exported_at: ExportedAt;
  site: SiteDTO;
  contents: Contents;
  comments: Comments1;
  taxonomies: Taxonomies;
}
export interface SiteDTO {
  name: Name;
  description: Description1;
  author: Author2;
  avatar_url: AvatarUrl;
  hero_url: HeroUrl;
  hero_title: HeroTitle;
  hero_subtitle: HeroSubtitle;
  notice: Notice;
  navigation: Navigation;
  stats: SiteStats;
}
export interface NavigationItem {
  label: Label1;
  href: Href;
  icon?: Icon1;
}
export interface SiteStats {
  articles: Articles;
  pages: Pages;
  comments: Comments;
  tags: Tags;
  categories: Categories;
}
export interface ContentDetail {
  id: Id7;
  kind: Kind;
  title: Title3;
  path: Path;
  excerpt: Excerpt3;
  language: Language;
  published_at: PublishedAt2;
  updated_at: UpdatedAt2;
  author: Author3;
  cover_url: CoverUrl;
  reading_minutes: ReadingMinutes;
  word_count: WordCount;
  categories: Categories1;
  tags: Tags1;
  comment_count: CommentCount;
  pinned: Pinned;
  content: Content1;
  media_urls: MediaUrls;
}
export interface TaxonomyDTO {
  id: Id8;
  slug: Slug;
  name: Name1;
  kind: Kind1;
  count: Count;
}
export interface ContentBlock {
  id: Id9;
  type: Type1;
  content: Content2;
}
export interface MediaUrls {
  [k: string]: MediaURL;
}
export interface MediaURL {
  original: Original;
  webp?: Webp;
}
export interface Comments1 {
  [k: string]: PublicComment[];
}
export interface PublicComment {
  id: Id10;
  parent_id: ParentId;
  author: Author4;
  content: Content3;
  created_at: CreatedAt2;
  reply_to?: ReplyTo;
}
