/* Generated from the backend public contract. Do not edit by hand. */

export type Success = boolean;
export type Code = number;
export type Msg = string;
export type DefaultCode = string;
export type Code1 = string;
export type Name = string;
export type Flag = string;
export type Prefix = string;
export type Enabled = boolean;
export type UiLocale = "zh-CN" | "en";
/**
 * @minItems 1
 */
export type Languages = LanguageDefinition[];
export type Success1 = boolean;
export type Code2 = number;
export type Msg1 = string;
export type Id = string;
export type TypeId = string;
export type Name1 = string;
export type ParentId = string | null;
export type Success2 = boolean;
export type Code3 = number;
export type Msg2 = string;
export type Name2 = string;
export type Kind = string;
export type Id1 = string;
export type Count = number;
export type ParentId1 = string | null;
export type Terms = EditorTerm[];
export type TypeId1 = string;
export type Search = string;
export type Status = "all" | "draft" | "published" | "trash";
export type Page = number;
export type PageSize = number;
export type Language = string | null;
export type Grouped = boolean;
export type Id2 = string;
export type OperationId = string;
export type TypeId2 = string;
export type Title = string;
export type Excerpt = string;
export type Id3 = string;
export type Type = "markdown" | "html";
export type Content = string;
/**
 * @minItems 1
 * @maxItems 128
 */
export type Body = DraftBlock[];
export type Path = string;
export type DisplayPublishedAt = string | null;
export type CoverMediaId = string | null;
/**
 * @maxItems 20
 */
export type Categories = string[];
/**
 * @maxItems 30
 */
export type Tags = string[];
export type Pinned = boolean;
export type CommentsOpen = boolean;
export type SeoTitle = string;
export type SeoDescription = string;
export type Visibility = "public" | "password";
export type OpensAt = string | null;
export type AccessPassword = string | null;
export type Language1 = string | null;
export type Id4 = string;
export type OperationId1 = string;
export type ExpectedRevision = number;
export type Id5 = string;
export type OperationId2 = string;
export type ExpectedRevision1 = number;
export type ScheduledFor = string;
export type Id6 = string;
export type OperationId3 = string;
export type ExpectedRevision2 = number;
export type Success3 = boolean;
export type Code4 = number;
export type Msg3 = string;
export type Id7 = string;
export type OwnerId = string | null;
export type TypeId3 = string;
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
export type ScheduledFor1 = string | null;
export type ScheduledRevision = number | null;
export type ScheduleError = string | null;
export type CreatedAt = string;
export type UpdatedAt = string;
export type Language2 = string;
export type TranslationGroupId = string | null;
export type CoverUrl = string | null;
export type Categories1 = string[];
export type Tags1 = string[];
export type CommentCount = number;
export type Pinned1 = boolean;
export type Id8 = string;
export type OwnerId1 = string | null;
export type TypeId4 = string;
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
export type ScheduledFor2 = string | null;
export type ScheduledRevision1 = number | null;
export type ScheduleError1 = string | null;
export type CreatedAt1 = string;
export type UpdatedAt1 = string;
export type Language3 = string;
export type TranslationGroupId1 = string | null;
export type IsOriginal = boolean;
export type NeedsReview = boolean;
export type Translations = TranslationMember[];
export type GroupRevision = number;
export type Items = DraftListItem[];
export type Total = number;
export type Page1 = number;
export type PageSize1 = number;
export type Success4 = boolean;
export type Code5 = number;
export type Msg4 = string;
export type Id9 = string;
export type OwnerId2 = string | null;
export type TypeId5 = string;
export type Title3 = string;
export type Excerpt3 = string;
export type Preview2 = string;
export type Author2 = string;
export type Revision2 = number;
export type Status3 = "draft" | "trash";
export type IsDemo2 = boolean;
export type PublishedRevision2 = number | null;
export type PublicPath2 = string | null;
export type PublishedAt2 = string | null;
export type ScheduledFor3 = string | null;
export type ScheduledRevision2 = number | null;
export type ScheduleError2 = string | null;
export type CreatedAt2 = string;
export type UpdatedAt2 = string;
export type Language4 = string;
export type TranslationGroupId2 = string | null;
export type Body1 = DraftBlock[];
export type Original = string;
export type Webp = string;
export type Family = string;
export type Style = "normal" | "italic";
export type WeightMin = number;
export type WeightMax = number;
export type Format = "woff2" | "woff" | "truetype" | "opentype";
export type HasPassword = boolean;
export type Success5 = boolean;
export type Code6 = number;
export type Msg5 = string;
export type Id10 = string;
export type Owner = string;
export type Label = string;
export type Description = string;
export type Icon = string;
export type Order = number;
export type TitleRequired = boolean;
export type SupportsExcerpt = boolean;
export type Editor = string;
export type Panels = string[];
export type Items1 = ContentTypeDefinition[];
export type Success6 = boolean;
export type Code7 = number;
export type Msg6 = string;
export type SourceEpoch = string;
export type Revision3 = number;
export type NodeId = string;
export type Enabled1 = boolean;
export type DesiredRevision = number;
export type AppliedRevision = number | null;
export type Status4 = "not_configured" | "pending" | "applied" | "failed";
export type AppliedAt = string | null;
export type Error = string | null;
export type Delivery = DeliveryState[];
export type Protocol = "content-1";
export type NodeId1 = string;
export type SourceEpoch1 = string;
export type Resource = "public-content";
export type Revision4 = number;
export type SchemaVersion =
  "0.1.0" | "0.2.0" | "0.3.0" | "0.4.0" | "0.5.0" | "0.6.0" | "0.7.0";
export type SourceEpoch2 = string;
export type Generation = number;
export type ExportedAt = string;
export type Name3 = string;
export type Description1 = string;
export type Author3 = string;
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
export type Tags2 = number;
export type Categories2 = number;
export type CommentsOpen1 = boolean;
export type SeoTitle1 = string;
export type SeoDescription1 = string;
export type Access = "public" | "password" | "scheduled";
export type OpensAt1 = string | null;
export type Id11 = string;
export type Kind1 = "article" | "shuoshuo" | "page";
export type Title4 = string;
export type Path1 = string;
export type Excerpt4 = string;
export type Language5 = string;
export type TranslationGroupId3 = string | null;
export type Id12 = string;
export type Language6 = string;
export type Path2 = string;
export type Access1 = "public" | "password" | "scheduled";
export type IsOriginal1 = boolean;
export type Translations1 = ContentTranslation[];
export type PublishedAt3 = string;
export type UpdatedAt3 = string;
export type Author4 = string;
export type CoverUrl1 = string | null;
export type ReadingMinutes = number;
export type WordCount = number;
export type Id13 = string;
export type Slug = string;
export type Name4 = string;
export type Kind2 = "category" | "tag";
export type Count1 = number;
export type Categories3 = TaxonomyDTO[];
export type Tags3 = TaxonomyDTO[];
export type CommentCount1 = number;
export type Pinned2 = boolean;
export type Id14 = string;
export type Type1 = "markdown" | "html";
export type Content2 = string;
export type Content1 = ContentBlock[];
export type Contents = ContentDetail[];
export type Id15 = string;
export type ParentId2 = string | null;
export type Author5 = string;
/**
 * 纯文本，按文本展示，不再作为 HTML 解析
 */
export type Content3 = string;
export type CreatedAt3 = string;
export type ReplyTo = string | null;
export type Taxonomies = TaxonomyDTO[];
export type Title5 = string;
export type Path3 = string;
export type Description2 = string;
export type AllowIndexing = boolean;
export type Enabled2 = true;
export type Html = string;
export type Css = string;
export type Javascript = string;
export type JavascriptEnabled = boolean;
export type JsonValue = unknown;
export type Id16 = string;
export type Source = "custom" | "registered";
export type ImplementationId = string | null;
export type ImplementationVersion = string | null;
export type Revision5 = number;
export type Pages1 = PublicManagedPage[];
export type Success7 = boolean;
export type Code8 = number;
export type Msg7 = string;
export type Id17 = string;
export type SourceId = string;
export type TypeId6 = string;
export type Revision6 = number;
export type Members = TranslationMember[];
export type Id18 = string;
export type OperationId4 = string;
export type ExpectedRevision3 = number;
export type Language7 = string;
export type CopySource = boolean;
export type Id19 = string;
export type OperationId5 = string;
export type ExpectedRevision4 = number;
export type TargetId = string;
export type Id20 = string;
export type OperationId6 = string;
export type ExpectedRevision5 = number;
export type Id21 = string;
export type OperationId7 = string;
export type ExpectedRevision6 = number;

export interface ContentAdminContract {
  languages: PublicResponseLanguageCatalog;
  actions: PublicResponseContentActions;
  create_category: EditorTermCreate;
  editor_catalog: PublicResponseEditorCatalog;
  query: DraftQuery;
  lookup: DraftLookup;
  create: DraftCreate;
  save: DraftSave;
  schedule: DraftSchedule;
  mutation: DraftMutation;
  catalog: PublicResponseDraftCatalog;
  detail: PublicResponseDraftDetail;
  types: PublicResponseContentTypeCatalog;
  sync_state: PublicResponseContentSyncState;
  delivery: ContentDelivery;
  translation_catalog: PublicResponseTranslationCatalog;
  translation_create: TranslationCreate;
  translation_link: TranslationLink;
  translation_mutation: TranslationMutation;
  translation_group_mutation: TranslationGroupMutation;
}
export interface PublicResponseLanguageCatalog {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: LanguageCatalog;
}
export interface LanguageCatalog {
  default_code?: DefaultCode;
  languages?: Languages;
}
export interface LanguageDefinition {
  code: Code1;
  name: Name;
  flag?: Flag;
  prefix?: Prefix;
  enabled?: Enabled;
  ui_locale?: UiLocale;
}
export interface PublicResponseContentActions {
  success?: Success1;
  code?: Code2;
  msg?: Msg1;
  data: ContentActions;
}
export interface ContentActions {
  edit?: ContentEditAction | null;
}
export interface ContentEditAction {
  id: Id;
  type_id: TypeId;
}
export interface EditorTermCreate {
  name: Name1;
  parent_id?: ParentId;
}
export interface PublicResponseEditorCatalog {
  success?: Success2;
  code?: Code3;
  msg?: Msg2;
  data: EditorCatalog;
}
export interface EditorCatalog {
  terms: Terms;
}
export interface EditorTerm {
  name: Name2;
  kind: Kind;
  id: Id1;
  count?: Count;
  parent_id?: ParentId1;
}
export interface DraftQuery {
  type_id: TypeId1;
  search?: Search;
  status?: Status;
  page?: Page;
  page_size?: PageSize;
  language?: Language;
  grouped?: Grouped;
}
export interface DraftLookup {
  id: Id2;
}
export interface DraftCreate {
  operation_id: OperationId;
  type_id: TypeId2;
  fields: DraftFields;
  language?: Language1;
}
export interface DraftFields {
  title?: Title;
  excerpt?: Excerpt;
  body: Body;
  settings?: EditorSettings | null;
  access_password?: AccessPassword;
}
export interface DraftBlock {
  id: Id3;
  type?: Type;
  content: Content;
}
export interface EditorSettings {
  path?: Path;
  display_published_at?: DisplayPublishedAt;
  cover_media_id?: CoverMediaId;
  categories?: Categories;
  tags?: Tags;
  pinned?: Pinned;
  comments_open?: CommentsOpen;
  seo_title?: SeoTitle;
  seo_description?: SeoDescription;
  visibility?: Visibility;
  opens_at?: OpensAt;
}
export interface DraftSave {
  id: Id4;
  operation_id: OperationId1;
  expected_revision: ExpectedRevision;
  fields: DraftFields;
}
export interface DraftSchedule {
  id: Id5;
  operation_id: OperationId2;
  expected_revision: ExpectedRevision1;
  fields: DraftFields;
  scheduled_for: ScheduledFor;
}
export interface DraftMutation {
  id: Id6;
  operation_id: OperationId3;
  expected_revision: ExpectedRevision2;
}
export interface PublicResponseDraftCatalog {
  success?: Success3;
  code?: Code4;
  msg?: Msg3;
  data: DraftCatalog;
}
export interface DraftCatalog {
  items: Items;
  total: Total;
  page: Page1;
  page_size: PageSize1;
}
export interface DraftListItem {
  id: Id7;
  owner_id?: OwnerId;
  type_id: TypeId3;
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
  scheduled_for?: ScheduledFor1;
  scheduled_revision?: ScheduledRevision;
  schedule_error?: ScheduleError;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
  language?: Language2;
  translation_group_id?: TranslationGroupId;
  cover_url?: CoverUrl;
  categories?: Categories1;
  tags?: Tags1;
  comment_count?: CommentCount;
  pinned?: Pinned1;
  translations?: Translations;
  group_revision?: GroupRevision;
}
export interface TranslationMember {
  id: Id8;
  owner_id?: OwnerId1;
  type_id: TypeId4;
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
  scheduled_for?: ScheduledFor2;
  scheduled_revision?: ScheduledRevision1;
  schedule_error?: ScheduleError1;
  created_at: CreatedAt1;
  updated_at: UpdatedAt1;
  language?: Language3;
  translation_group_id?: TranslationGroupId1;
  is_original: IsOriginal;
  needs_review?: NeedsReview;
}
export interface PublicResponseDraftDetail {
  success?: Success4;
  code?: Code5;
  msg?: Msg4;
  data: DraftDetail;
}
export interface DraftDetail {
  id: Id9;
  owner_id?: OwnerId2;
  type_id: TypeId5;
  title: Title3;
  excerpt: Excerpt3;
  preview: Preview2;
  author: Author2;
  revision: Revision2;
  status: Status3;
  is_demo: IsDemo2;
  published_revision?: PublishedRevision2;
  public_path?: PublicPath2;
  published_at?: PublishedAt2;
  scheduled_for?: ScheduledFor3;
  scheduled_revision?: ScheduledRevision2;
  schedule_error?: ScheduleError2;
  created_at: CreatedAt2;
  updated_at: UpdatedAt2;
  language?: Language4;
  translation_group_id?: TranslationGroupId2;
  body: Body1;
  settings?: EditorSettings;
  media_urls?: MediaUrls;
  has_password?: HasPassword;
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
export interface PublicResponseContentTypeCatalog {
  success?: Success5;
  code?: Code6;
  msg?: Msg5;
  data: ContentTypeCatalog;
}
export interface ContentTypeCatalog {
  items: Items1;
}
export interface ContentTypeDefinition {
  id: Id10;
  owner: Owner;
  label: Label;
  description: Description;
  icon: Icon;
  order: Order;
  title_required: TitleRequired;
  supports_excerpt: SupportsExcerpt;
  editor: Editor;
  panels?: Panels;
}
export interface PublicResponseContentSyncState {
  success?: Success6;
  code?: Code7;
  msg?: Msg6;
  data: ContentSyncState;
}
export interface ContentSyncState {
  source_epoch: SourceEpoch;
  revision: Revision3;
  delivery: Delivery;
}
export interface DeliveryState {
  node_id: NodeId;
  enabled: Enabled1;
  desired_revision: DesiredRevision;
  applied_revision: AppliedRevision;
  status: Status4;
  applied_at: AppliedAt;
  error: Error;
}
export interface ContentDelivery {
  protocol?: Protocol;
  node_id: NodeId1;
  source_epoch: SourceEpoch1;
  resource?: Resource;
  revision: Revision4;
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
  pages?: Pages1;
}
export interface SiteDTO {
  name: Name3;
  description: Description1;
  author: Author3;
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
  tags: Tags2;
  categories: Categories2;
}
export interface ContentDetail {
  comments_open?: CommentsOpen1;
  seo_title?: SeoTitle1;
  seo_description?: SeoDescription1;
  access?: Access;
  opens_at?: OpensAt1;
  id: Id11;
  kind: Kind1;
  title: Title4;
  path: Path1;
  excerpt: Excerpt4;
  language: Language5;
  translation_group_id?: TranslationGroupId3;
  translations?: Translations1;
  published_at: PublishedAt3;
  updated_at: UpdatedAt3;
  author: Author4;
  cover_url: CoverUrl1;
  reading_minutes: ReadingMinutes;
  word_count: WordCount;
  categories: Categories3;
  tags: Tags3;
  comment_count: CommentCount1;
  pinned: Pinned2;
  content: Content1;
  media_urls: MediaUrls1;
}
export interface ContentTranslation {
  id: Id12;
  language: Language6;
  path: Path2;
  access?: Access1;
  is_original?: IsOriginal1;
}
export interface TaxonomyDTO {
  id: Id13;
  slug: Slug;
  name: Name4;
  kind: Kind2;
  count: Count1;
}
export interface ContentBlock {
  id: Id14;
  type: Type1;
  content: Content2;
}
export interface MediaUrls1 {
  [k: string]: MediaURL;
}
export interface Comments1 {
  [k: string]: PublicComment[];
}
export interface PublicComment {
  id: Id15;
  parent_id: ParentId2;
  author: Author5;
  content: Content3;
  created_at: CreatedAt3;
  reply_to?: ReplyTo;
}
export interface PublicManagedPage {
  title: Title5;
  path: Path3;
  description?: Description2;
  allow_indexing?: AllowIndexing;
  enabled?: Enabled2;
  html?: Html;
  css?: Css;
  javascript?: Javascript;
  javascript_enabled?: JavascriptEnabled;
  options?: Options;
  id: Id16;
  source: Source;
  implementation_id?: ImplementationId;
  implementation_version?: ImplementationVersion;
  revision: Revision5;
}
export interface Options {
  [k: string]: JsonValue;
}
export interface PublicResponseTranslationCatalog {
  success?: Success7;
  code?: Code8;
  msg?: Msg7;
  data: TranslationCatalog;
}
export interface TranslationCatalog {
  id: Id17;
  source_id: SourceId;
  type_id: TypeId6;
  revision: Revision6;
  members: Members;
}
export interface TranslationCreate {
  id: Id18;
  operation_id: OperationId4;
  expected_revision: ExpectedRevision3;
  language: Language7;
  copy_source?: CopySource;
}
export interface TranslationLink {
  id: Id19;
  operation_id: OperationId5;
  expected_revision: ExpectedRevision4;
  target_id: TargetId;
}
export interface TranslationMutation {
  id: Id20;
  operation_id: OperationId6;
  expected_revision: ExpectedRevision5;
}
export interface TranslationGroupMutation {
  id: Id21;
  operation_id: OperationId7;
  expected_revision: ExpectedRevision6;
  members: Members1;
}
export interface Members1 {
  [k: string]: number;
}
