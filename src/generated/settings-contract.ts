/* Generated from the backend public contract. Do not edit by hand. */

export type Success = boolean;
export type Code = number;
export type Msg = string;
export type Id = string;
export type Label = string;
export type Url = string;
export type Mime = string;
export type Size = number;
export type CreatedAt = string;
export type Reused = boolean;
export type Family = string;
export type Style = "normal" | "italic";
export type WeightMin = number;
export type WeightMax = number;
export type Format = "woff2" | "woff" | "truetype" | "opentype";
export type CssFamily = string;
export type Items = FontAsset[];
export type Page = number;
export type Total = number;
export type PageSize = number;
export type Id1 = string;
export type ExpectedRevision = number;
export type DeleteOriginal = boolean;
export type SafeDelete = boolean;
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type Id2 = string;
export type Token = string;
export type RecordCount = number;
export type FileCount = number;
export type FileRetained = boolean;
export type DeleteOriginal1 = boolean;
export type SafeDelete1 = boolean;
export type ResumeOperationId = string | null;
export type Id3 = string;
export type ExpectedRevision1 = number;
export type DeleteOriginal2 = boolean;
export type SafeDelete2 = boolean;
export type OperationId = string;
export type ExpectedPlan = string;
export type Success2 = boolean;
export type Code2 = number;
export type Msg2 = string;
export type Id4 = string;
export type Deleted = boolean;
export type Purged = boolean;
export type PurgePending = boolean;
export type RecordsRemoved = number;
export type FilesDeleted = number;
export type FileRetained1 = boolean;
export type Id5 = string;
export type Id6 = string;
export type ExpectedRevision2 = number;
export type Title = string;
export type AltText = string;
export type Caption = string;
export type Description = string;
export type Id7 = string;
export type EditId = string;
export type Rotation = 0 | 90 | 180 | 270;
export type FlipHorizontal = boolean;
export type FlipVertical = boolean;
export type X = number;
export type Y = number;
export type Width = number;
export type Height = number;
export type OutputWidth = number | null;
export type Success3 = boolean;
export type Code3 = number;
export type Msg3 = string;
export type Id8 = string;
export type Label1 = string;
export type Url1 = string;
export type Mime1 = string;
export type Size1 = number;
export type CreatedAt1 = string;
export type Reused1 = boolean;
export type Kind = "image" | "video" | "file";
export type Title1 = string;
export type Deleted1 = boolean;
export type PurgePending1 = boolean;
export type Revision = number;
export type Width1 = number | null;
export type Height1 = number | null;
export type Uploader = string;
export type SourceId = string | null;
export type Editable = boolean;
export type Query = string;
export type Page1 = number;
export type Kind1 = "all" | "image" | "video" | "file";
export type Trash = boolean;
export type Purpose = "library" | "icon" | "font";
export type Filename = string;
export type UploadId = string;
export type Success4 = boolean;
export type Code4 = number;
export type Msg4 = string;
export type Id9 = string;
export type Label2 = string;
export type Url2 = string;
export type Mime2 = string;
export type Size2 = number;
export type CreatedAt2 = string;
export type Reused2 = boolean;
export type Kind2 = "image" | "video" | "file";
export type Title2 = string;
export type Deleted2 = boolean;
export type PurgePending2 = boolean;
export type Items1 = MediaItem[];
export type Page2 = number;
export type Total1 = number;
export type PageSize1 = number;
export type Success5 = boolean;
export type Code5 = number;
export type Msg5 = string;
export type Success6 = boolean;
export type Code6 = number;
export type Msg6 = string;
export type Id10 = string;
export type Label3 = string;
export type Url3 = string;
export type Mime3 = string;
export type Size3 = number;
export type CreatedAt3 = string;
export type Reused3 = boolean;
export type Items2 = IconAsset[];
export type Page3 = number;
export type Total2 = number;
export type PageSize2 = number;
export type Query1 = string;
export type Page4 = number;
export type Filename1 = string;
export type DataBase64 = string;
export type UploadId1 = string;
export type Success7 = boolean;
export type Code7 = number;
export type Msg7 = string;
export type Success8 = boolean;
export type Code8 = number;
export type Msg8 = string;
export type SourceEpoch = string;
export type Revision1 = number;
export type Name = string;
export type Description1 = string;
export type Author = string;
export type AvatarMediaId = string;
export type AvatarUrl = string;
export type NoticeTitle = string;
export type Notice = string;
export type Id11 = string;
export type Label4 = string;
export type Href = string;
export type Icon = string;
export type Children = MenuItem[];
export type Navigation = MenuItem[];
export type SeoDescription = string;
export type TitleTemplate = string;
export type AllowIndexing = boolean;
export type Accent = string;
export type Mode = "system" | "light" | "dark";
export type HeroTitle = string;
export type HeroSubtitle = string;
export type BackgroundMediaId = string;
export type BackgroundVideoMediaId = string;
export type BackgroundUrl = string;
export type BackgroundVideoUrl = string;
export type BackgroundPlay = boolean;
export type NodeId = string;
export type Enabled = boolean;
export type DesiredRevision = number;
export type AppliedRevision = number | null;
export type Status = "not_configured" | "pending" | "applied" | "failed";
export type AppliedAt = string | null;
export type Error = string | null;
export type Delivery = DeliveryState[];
export type ExpectedRevision3 = number;
export type Success9 = boolean;
export type Code9 = number;
export type Msg9 = string;
export type NodeId1 = string;
export type SourceEpoch1 = string;
export type Revision2 = number;
export type DynamicFreshnessSeconds = number;
export type RequestTimeoutSeconds = number;
export type RetryDelayMs = number;
export type BatchDelayMs = number;
export type ExpectedRevision4 = number;
export type Success10 = boolean;
export type Code10 = number;
export type Msg10 = string;
export type Nodes = PolicyState[];
export type Protocol = "settings-1";
export type NodeId2 = string;
export type SourceEpoch2 = string;
export type Resource = "public-settings" | "cache-policy";
export type Revision3 = number;
export type Value = PublicSettings | CachePolicy;
export type NodeId3 = string;
export type SourceEpoch3 = string;
export type Resource1 = "public-settings" | "cache-policy";
export type Revision4 = number;
export type Digest = string;
export type Durable = true;

export interface SettingsContract {
  fonts: PublicResponseFontCatalog;
  media_removal_intent: MediaRemovalIntent;
  media_removal_preview: PublicResponseMediaRemovalPreview;
  media_remove: MediaRemove;
  media_removal: PublicResponseMediaRemoval;
  media_lookup: MediaLookup;
  media_update: MediaUpdate;
  media_edit: MediaEdit;
  media_details: PublicResponseMediaDetails;
  media_query: MediaQuery;
  media_upload: MediaUpload;
  media_catalog: PublicResponseMediaCatalog;
  media_item: PublicResponseMediaItem;
  icons: PublicResponseIconCatalog;
  icon_query: IconQuery;
  icon_upload: IconUpload;
  icon: PublicResponseIconAsset;
  settings: PublicResponseSettingsState;
  save_settings: SaveSettings;
  policy: PublicResponsePolicyState;
  save_policy: SavePolicy;
  nodes: PublicResponseNodeList;
  delivery: SettingsDelivery;
  receipt: DeliveryReceipt;
}
export interface PublicResponseFontCatalog {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: FontCatalog;
}
export interface FontCatalog {
  items: Items;
  page: Page;
  total: Total;
  page_size?: PageSize;
}
export interface FontAsset {
  id: Id;
  label: Label;
  url: Url;
  mime: Mime;
  size: Size;
  created_at: CreatedAt;
  reused?: Reused;
  info: FontInfo;
  css_family: CssFamily;
}
export interface FontInfo {
  family: Family;
  style: Style;
  weight_min: WeightMin;
  weight_max: WeightMax;
  format: Format;
}
export interface MediaRemovalIntent {
  id: Id1;
  expected_revision: ExpectedRevision;
  delete_original?: DeleteOriginal;
  safe_delete?: SafeDelete;
}
export interface PublicResponseMediaRemovalPreview {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: MediaRemovalPreview;
}
export interface MediaRemovalPreview {
  id: Id2;
  token: Token;
  record_count: RecordCount;
  file_count: FileCount;
  file_retained: FileRetained;
  delete_original: DeleteOriginal1;
  safe_delete: SafeDelete1;
  resume_operation_id?: ResumeOperationId;
}
export interface MediaRemove {
  id: Id3;
  expected_revision: ExpectedRevision1;
  delete_original?: DeleteOriginal2;
  safe_delete?: SafeDelete2;
  operation_id: OperationId;
  expected_plan: ExpectedPlan;
}
export interface PublicResponseMediaRemoval {
  success?: Success2;
  code?: Code2;
  msg?: Msg2;
  data: MediaRemoval;
}
export interface MediaRemoval {
  id: Id4;
  deleted: Deleted;
  purged: Purged;
  purge_pending: PurgePending;
  records_removed?: RecordsRemoved;
  files_deleted?: FilesDeleted;
  file_retained?: FileRetained1;
}
export interface MediaLookup {
  id: Id5;
}
export interface MediaUpdate {
  id: Id6;
  expected_revision: ExpectedRevision2;
  metadata: MediaMetadata;
}
export interface MediaMetadata {
  title?: Title;
  alt_text?: AltText;
  caption?: Caption;
  description?: Description;
}
export interface MediaEdit {
  id: Id7;
  edit_id: EditId;
  recipe: ImageRecipe;
}
export interface ImageRecipe {
  rotation?: Rotation;
  flip_horizontal?: FlipHorizontal;
  flip_vertical?: FlipVertical;
  crop?: CropRect | null;
  output_width?: OutputWidth;
}
export interface CropRect {
  x: X;
  y: Y;
  width: Width;
  height: Height;
}
export interface PublicResponseMediaDetails {
  success?: Success3;
  code?: Code3;
  msg?: Msg3;
  data: MediaDetails;
}
export interface MediaDetails {
  id: Id8;
  label: Label1;
  url: Url1;
  mime: Mime1;
  size: Size1;
  created_at: CreatedAt1;
  reused?: Reused1;
  kind: Kind;
  title?: Title1;
  deleted?: Deleted1;
  purge_pending?: PurgePending1;
  metadata: MediaMetadata;
  revision: Revision;
  width: Width1;
  height: Height1;
  uploader: Uploader;
  source_id: SourceId;
  editable: Editable;
}
export interface MediaQuery {
  query?: Query;
  page?: Page1;
  kind?: Kind1;
  trash?: Trash;
}
export interface MediaUpload {
  purpose?: Purpose;
  filename: Filename;
  upload_id: UploadId;
}
export interface PublicResponseMediaCatalog {
  success?: Success4;
  code?: Code4;
  msg?: Msg4;
  data: MediaCatalog;
}
export interface MediaCatalog {
  items: Items1;
  page: Page2;
  total: Total1;
  page_size?: PageSize1;
}
export interface MediaItem {
  id: Id9;
  label: Label2;
  url: Url2;
  mime: Mime2;
  size: Size2;
  created_at: CreatedAt2;
  reused?: Reused2;
  kind: Kind2;
  title?: Title2;
  deleted?: Deleted2;
  purge_pending?: PurgePending2;
}
export interface PublicResponseMediaItem {
  success?: Success5;
  code?: Code5;
  msg?: Msg5;
  data: MediaItem;
}
export interface PublicResponseIconCatalog {
  success?: Success6;
  code?: Code6;
  msg?: Msg6;
  data: IconCatalog;
}
export interface IconCatalog {
  items: Items2;
  page: Page3;
  total: Total2;
  page_size?: PageSize2;
}
export interface IconAsset {
  id: Id10;
  label: Label3;
  url: Url3;
  mime: Mime3;
  size: Size3;
  created_at: CreatedAt3;
  reused?: Reused3;
}
export interface IconQuery {
  query?: Query1;
  page?: Page4;
}
export interface IconUpload {
  filename: Filename1;
  data_base64: DataBase64;
  upload_id: UploadId1;
}
export interface PublicResponseIconAsset {
  success?: Success7;
  code?: Code7;
  msg?: Msg7;
  data: IconAsset;
}
export interface PublicResponseSettingsState {
  success?: Success8;
  code?: Code8;
  msg?: Msg8;
  data: SettingsState;
}
export interface SettingsState {
  source_epoch: SourceEpoch;
  revision: Revision1;
  value: PublicSettings;
  delivery: Delivery;
}
export interface PublicSettings {
  site: SitePreferences;
  theme: ThemePreferences;
  icon_urls?: IconUrls;
}
export interface SitePreferences {
  name: Name;
  description: Description1;
  author: Author;
  avatar_media_id?: AvatarMediaId;
  avatar_url?: AvatarUrl;
  notice_title?: NoticeTitle;
  notice?: Notice;
  navigation?: Navigation;
  seo_description?: SeoDescription;
  title_template?: TitleTemplate;
  allow_indexing?: AllowIndexing;
}
export interface MenuItem {
  id: Id11;
  label: Label4;
  href: Href;
  icon?: Icon;
  children?: Children;
}
export interface ThemePreferences {
  accent?: Accent;
  mode?: Mode;
  hero_title?: HeroTitle;
  hero_subtitle?: HeroSubtitle;
  background_media_id?: BackgroundMediaId;
  background_video_media_id?: BackgroundVideoMediaId;
  background_url?: BackgroundUrl;
  background_video_url?: BackgroundVideoUrl;
  background_play?: BackgroundPlay;
}
export interface IconUrls {
  [k: string]: string;
}
export interface DeliveryState {
  node_id: NodeId;
  enabled: Enabled;
  desired_revision: DesiredRevision;
  applied_revision: AppliedRevision;
  status: Status;
  applied_at: AppliedAt;
  error: Error;
}
export interface SaveSettings {
  expected_revision: ExpectedRevision3;
  value: PublicSettings;
}
export interface PublicResponsePolicyState {
  success?: Success9;
  code?: Code9;
  msg?: Msg9;
  data: PolicyState;
}
export interface PolicyState {
  node_id: NodeId1;
  source_epoch: SourceEpoch1;
  revision: Revision2;
  value: CachePolicy;
  delivery: DeliveryState;
}
/**
 * First operational policy: request lifetime, refresh freshness and batching.
 */
export interface CachePolicy {
  dynamic_freshness_seconds?: DynamicFreshnessSeconds;
  request_timeout_seconds?: RequestTimeoutSeconds;
  retry_delay_ms?: RetryDelayMs;
  batch_delay_ms?: BatchDelayMs;
}
export interface SavePolicy {
  expected_revision: ExpectedRevision4;
  value: CachePolicy;
}
export interface PublicResponseNodeList {
  success?: Success10;
  code?: Code10;
  msg?: Msg10;
  data: NodeList;
}
export interface NodeList {
  nodes: Nodes;
}
export interface SettingsDelivery {
  protocol?: Protocol;
  node_id: NodeId2;
  source_epoch: SourceEpoch2;
  resource: Resource;
  revision: Revision3;
  value: Value;
}
export interface DeliveryReceipt {
  node_id: NodeId3;
  source_epoch: SourceEpoch3;
  resource: Resource1;
  revision: Revision4;
  digest: Digest;
  durable: Durable;
}
