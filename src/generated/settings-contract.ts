/* Generated from the backend public contract. Do not edit by hand. */

export type Success = boolean;
export type Code = number;
export type Msg = string;
export type Id = string;
export type Origin = "backend" | "custom";
export type Editable = boolean;
export type Revision = number;
export type AppliedRevision = number | null;
export type Archived = boolean;
export type Name = string;
export type Title = string;
export type Description = string;
export type Kind = "leaf" | "container";
export type Name1 = string;
export type Label = string;
export type Type = "text" | "url" | "select" | "number" | "boolean";
export type Default = string;
export type Required = boolean;
/**
 * @maxItems 20
 */
export type Options = string[];
/**
 * @maxItems 16
 */
export type Parameters = ShortcodeParameter[];
export type Html = string;
export type Css = string;
export type ExampleBody = string;
export type Id1 = string;
export type Name2 = string;
export type Title1 = string;
export type Description1 = string;
export type Kind1 = "leaf" | "container";
export type Parameters1 = ShortcodeParameter[];
export type Html1 = string;
export type Css1 = string;
export type Scope = string;
export type Revision1 = number;
export type Versions = number[];
export type Items = ShortcodeItem[];
export type SettingsRevision = number;
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type Success2 = boolean;
export type Code2 = number;
export type Msg2 = string;
export type Error = string;
export type Id2 = string | null;
export type ExpectedRevision = number;
export type Id3 = string;
export type ExpectedRevision1 = number;
export type Id4 = string;
export type ExpectedRevision2 = number;
export type Version = number;
export type Id5 = string | null;
export type Success3 = boolean;
export type Code3 = number;
export type Msg3 = string;
export type Id6 = string;
export type Label1 = string;
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
export type Items1 = FontAsset[];
export type Page = number;
export type Total = number;
export type PageSize = number;
export type Id7 = string;
export type ExpectedRevision3 = number;
export type DeleteOriginal = boolean;
export type SafeDelete = boolean;
export type Success4 = boolean;
export type Code4 = number;
export type Msg4 = string;
export type Id8 = string;
export type Token = string;
export type RecordCount = number;
export type FileCount = number;
export type FileRetained = boolean;
export type DeleteOriginal1 = boolean;
export type SafeDelete1 = boolean;
export type ResumeOperationId = string | null;
export type Id9 = string;
export type ExpectedRevision4 = number;
export type DeleteOriginal2 = boolean;
export type SafeDelete2 = boolean;
export type OperationId = string;
export type ExpectedPlan = string;
export type Success5 = boolean;
export type Code5 = number;
export type Msg5 = string;
export type Id10 = string;
export type Deleted = boolean;
export type Purged = boolean;
export type PurgePending = boolean;
export type RecordsRemoved = number;
export type FilesDeleted = number;
export type FileRetained1 = boolean;
export type Id11 = string;
export type Id12 = string;
export type ExpectedRevision5 = number;
export type Title2 = string;
export type AltText = string;
export type Caption = string;
export type Description2 = string;
export type Id13 = string;
export type EditId = string;
export type Rotation = 0 | 90 | 180 | 270;
export type FlipHorizontal = boolean;
export type FlipVertical = boolean;
export type X = number;
export type Y = number;
export type Width = number;
export type Height = number;
export type OutputWidth = number | null;
export type Success6 = boolean;
export type Code6 = number;
export type Msg6 = string;
export type Id14 = string;
export type Label2 = string;
export type Url1 = string;
export type Mime1 = string;
export type Size1 = number;
export type CreatedAt1 = string;
export type Reused1 = boolean;
export type Kind2 = "image" | "video" | "file";
export type Title3 = string;
export type Deleted1 = boolean;
export type PurgePending1 = boolean;
export type Revision2 = number;
export type Width1 = number | null;
export type Height1 = number | null;
export type Uploader = string;
export type SourceId = string | null;
export type Editable1 = boolean;
export type Query = string;
export type Page1 = number;
export type Kind3 = "all" | "image" | "video" | "file";
export type Trash = boolean;
export type Purpose = "library" | "icon" | "font";
export type Filename = string;
export type UploadId = string;
export type Success7 = boolean;
export type Code7 = number;
export type Msg7 = string;
export type Id15 = string;
export type Label3 = string;
export type Url2 = string;
export type Mime2 = string;
export type Size2 = number;
export type CreatedAt2 = string;
export type Reused2 = boolean;
export type Kind4 = "image" | "video" | "file";
export type Title4 = string;
export type Deleted2 = boolean;
export type PurgePending2 = boolean;
export type Items2 = MediaItem[];
export type Page2 = number;
export type Total1 = number;
export type PageSize1 = number;
export type Success8 = boolean;
export type Code8 = number;
export type Msg8 = string;
export type Success9 = boolean;
export type Code9 = number;
export type Msg9 = string;
export type Id16 = string;
export type Label4 = string;
export type Url3 = string;
export type Mime3 = string;
export type Size3 = number;
export type CreatedAt3 = string;
export type Reused3 = boolean;
export type Items3 = IconAsset[];
export type Page3 = number;
export type Total2 = number;
export type PageSize2 = number;
export type Query1 = string;
export type Page4 = number;
export type Filename1 = string;
export type DataBase64 = string;
export type UploadId1 = string;
export type Success10 = boolean;
export type Code10 = number;
export type Msg10 = string;
export type Success11 = boolean;
export type Code11 = number;
export type Msg11 = string;
export type SourceEpoch = string;
export type Revision3 = number;
export type DefaultCode = string;
export type Code12 = string;
export type Name3 = string;
export type Flag = string;
export type Prefix = string;
export type Enabled = boolean;
export type UiLocale = "zh-CN" | "en";
/**
 * @minItems 1
 */
export type Languages = LanguageDefinition[];
export type Name4 = string;
export type Description3 = string;
export type Author = string;
export type AvatarMediaId = string;
export type AvatarUrl = string;
export type NoticeTitle = string;
export type Notice = string;
export type Id17 = string;
export type Label5 = string;
export type Href = string;
export type Icon = string;
export type Children = MenuItem[];
export type Navigation = MenuItem[];
export type SeoDescription = string;
export type TitleTemplate = string;
export type AllowIndexing = boolean;
export type LightScheme = "paper" | "github";
export type DarkScheme = "slate" | "github";
export type LineNumbers = boolean;
export type Wrap = boolean;
export type CollapseLines = number;
export type FontSize = number;
export type LineHeight = number;
export type TabSize = number;
export type FontMediaId = string;
export type FontUrl = string;
export type FontMediaId1 = string;
export type FontUrl1 = string;
export type Accent = string;
export type Mode = "system" | "light" | "dark";
export type HeroTitle = string;
export type HeroSubtitle = string;
export type BackgroundMediaId = string;
export type BackgroundVideoMediaId = string;
export type BackgroundUrl = string;
export type BackgroundVideoUrl = string;
export type BackgroundPlay = boolean;
/**
 * @maxItems 100
 */
export type Shortcodes = PublicShortcode[];
export type NodeId = string;
export type Enabled1 = boolean;
export type DesiredRevision = number;
export type AppliedRevision1 = number | null;
export type Status = "not_configured" | "pending" | "applied" | "failed";
export type AppliedAt = string | null;
export type Error1 = string | null;
export type Delivery = DeliveryState[];
export type ExpectedRevision6 = number;
export type Success12 = boolean;
export type Code13 = number;
export type Msg12 = string;
export type NodeId1 = string;
export type SourceEpoch1 = string;
export type Revision4 = number;
export type DynamicFreshnessSeconds = number;
export type RequestTimeoutSeconds = number;
export type RetryDelayMs = number;
export type BatchDelayMs = number;
export type ExpectedRevision7 = number;
export type Success13 = boolean;
export type Code14 = number;
export type Msg13 = string;
export type Nodes = PolicyState[];
export type Protocol = "settings-1";
export type NodeId2 = string;
export type SourceEpoch2 = string;
export type Resource = "public-settings" | "cache-policy";
export type Revision5 = number;
export type Value = PublicSettings | CachePolicy;
export type NodeId3 = string;
export type SourceEpoch3 = string;
export type Resource1 = "public-settings" | "cache-policy";
export type Revision6 = number;
export type Digest = string;
export type Durable = true;

export interface SettingsContract {
  shortcode_catalog: PublicResponseShortcodeCatalog;
  shortcode_item: PublicResponseShortcodeItem;
  shortcode_preview: PublicResponseShortcodeCompilation;
  save_shortcode: SaveShortcode;
  shortcode_action: ShortcodeAction;
  restore_shortcode: RestoreShortcode;
  preview_shortcode: PreviewShortcode;
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
export interface PublicResponseShortcodeCatalog {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: ShortcodeCatalog;
}
export interface ShortcodeCatalog {
  items: Items;
  settings_revision: SettingsRevision;
}
export interface ShortcodeItem {
  id: Id;
  origin: Origin;
  editable: Editable;
  revision: Revision;
  applied_revision: AppliedRevision;
  archived: Archived;
  source: ShortcodeSource;
  compiled: PublicShortcode;
  versions?: Versions;
}
export interface ShortcodeSource {
  name: Name;
  title: Title;
  description?: Description;
  kind?: Kind;
  parameters?: Parameters;
  html: Html;
  css?: Css;
  example_body?: ExampleBody;
}
export interface ShortcodeParameter {
  name: Name1;
  label: Label;
  type?: Type;
  default?: Default;
  required?: Required;
  options?: Options;
}
export interface PublicShortcode {
  id: Id1;
  name: Name2;
  title: Title1;
  description: Description1;
  kind: Kind1;
  parameters: Parameters1;
  html: Html1;
  css: Css1;
  scope: Scope;
  revision: Revision1;
  media_urls?: MediaUrls;
}
export interface MediaUrls {
  [k: string]: string;
}
export interface PublicResponseShortcodeItem {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: ShortcodeItem;
}
export interface PublicResponseShortcodeCompilation {
  success?: Success2;
  code?: Code2;
  msg?: Msg2;
  data: ShortcodeCompilation;
}
export interface ShortcodeCompilation {
  compiled: PublicShortcode | null;
  error: Error;
}
export interface SaveShortcode {
  id?: Id2;
  expected_revision: ExpectedRevision;
  value: ShortcodeSource;
}
export interface ShortcodeAction {
  id: Id3;
  expected_revision: ExpectedRevision1;
}
export interface RestoreShortcode {
  id: Id4;
  expected_revision: ExpectedRevision2;
  version: Version;
}
export interface PreviewShortcode {
  id?: Id5;
  value: ShortcodeSource;
}
export interface PublicResponseFontCatalog {
  success?: Success3;
  code?: Code3;
  msg?: Msg3;
  data: FontCatalog;
}
export interface FontCatalog {
  items: Items1;
  page: Page;
  total: Total;
  page_size?: PageSize;
}
export interface FontAsset {
  id: Id6;
  label: Label1;
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
  id: Id7;
  expected_revision: ExpectedRevision3;
  delete_original?: DeleteOriginal;
  safe_delete?: SafeDelete;
}
export interface PublicResponseMediaRemovalPreview {
  success?: Success4;
  code?: Code4;
  msg?: Msg4;
  data: MediaRemovalPreview;
}
export interface MediaRemovalPreview {
  id: Id8;
  token: Token;
  record_count: RecordCount;
  file_count: FileCount;
  file_retained: FileRetained;
  delete_original: DeleteOriginal1;
  safe_delete: SafeDelete1;
  resume_operation_id?: ResumeOperationId;
}
export interface MediaRemove {
  id: Id9;
  expected_revision: ExpectedRevision4;
  delete_original?: DeleteOriginal2;
  safe_delete?: SafeDelete2;
  operation_id: OperationId;
  expected_plan: ExpectedPlan;
}
export interface PublicResponseMediaRemoval {
  success?: Success5;
  code?: Code5;
  msg?: Msg5;
  data: MediaRemoval;
}
export interface MediaRemoval {
  id: Id10;
  deleted: Deleted;
  purged: Purged;
  purge_pending: PurgePending;
  records_removed?: RecordsRemoved;
  files_deleted?: FilesDeleted;
  file_retained?: FileRetained1;
}
export interface MediaLookup {
  id: Id11;
}
export interface MediaUpdate {
  id: Id12;
  expected_revision: ExpectedRevision5;
  metadata: MediaMetadata;
}
export interface MediaMetadata {
  title?: Title2;
  alt_text?: AltText;
  caption?: Caption;
  description?: Description2;
}
export interface MediaEdit {
  id: Id13;
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
  success?: Success6;
  code?: Code6;
  msg?: Msg6;
  data: MediaDetails;
}
export interface MediaDetails {
  id: Id14;
  label: Label2;
  url: Url1;
  mime: Mime1;
  size: Size1;
  created_at: CreatedAt1;
  reused?: Reused1;
  kind: Kind2;
  title?: Title3;
  deleted?: Deleted1;
  purge_pending?: PurgePending1;
  metadata: MediaMetadata;
  revision: Revision2;
  width: Width1;
  height: Height1;
  uploader: Uploader;
  source_id: SourceId;
  editable: Editable1;
}
export interface MediaQuery {
  query?: Query;
  page?: Page1;
  kind?: Kind3;
  trash?: Trash;
}
export interface MediaUpload {
  purpose?: Purpose;
  filename: Filename;
  upload_id: UploadId;
}
export interface PublicResponseMediaCatalog {
  success?: Success7;
  code?: Code7;
  msg?: Msg7;
  data: MediaCatalog;
}
export interface MediaCatalog {
  items: Items2;
  page: Page2;
  total: Total1;
  page_size?: PageSize1;
}
export interface MediaItem {
  id: Id15;
  label: Label3;
  url: Url2;
  mime: Mime2;
  size: Size2;
  created_at: CreatedAt2;
  reused?: Reused2;
  kind: Kind4;
  title?: Title4;
  deleted?: Deleted2;
  purge_pending?: PurgePending2;
}
export interface PublicResponseMediaItem {
  success?: Success8;
  code?: Code8;
  msg?: Msg8;
  data: MediaItem;
}
export interface PublicResponseIconCatalog {
  success?: Success9;
  code?: Code9;
  msg?: Msg9;
  data: IconCatalog;
}
export interface IconCatalog {
  items: Items3;
  page: Page3;
  total: Total2;
  page_size?: PageSize2;
}
export interface IconAsset {
  id: Id16;
  label: Label4;
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
  success?: Success10;
  code?: Code10;
  msg?: Msg10;
  data: IconAsset;
}
export interface PublicResponseSettingsState {
  success?: Success11;
  code?: Code11;
  msg?: Msg11;
  data: SettingsState;
}
export interface SettingsState {
  source_epoch: SourceEpoch;
  revision: Revision3;
  value: PublicSettings;
  delivery: Delivery;
}
export interface PublicSettings {
  site: SitePreferences;
  theme: ThemePreferences;
  icon_urls?: IconUrls;
  shortcodes?: Shortcodes;
}
export interface SitePreferences {
  language_catalog?: LanguageCatalog;
  name: Name4;
  description: Description3;
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
export interface LanguageCatalog {
  default_code?: DefaultCode;
  languages?: Languages;
}
export interface LanguageDefinition {
  code: Code12;
  name: Name3;
  flag?: Flag;
  prefix?: Prefix;
  enabled?: Enabled;
  ui_locale?: UiLocale;
}
export interface MenuItem {
  id: Id17;
  label: Label5;
  href: Href;
  icon?: Icon;
  children?: Children;
}
export interface ThemePreferences {
  code?: CodePreferences;
  font_media_id?: FontMediaId1;
  font_url?: FontUrl1;
  font_info?: FontInfo | null;
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
export interface CodePreferences {
  light_scheme?: LightScheme;
  dark_scheme?: DarkScheme;
  line_numbers?: LineNumbers;
  wrap?: Wrap;
  collapse_lines?: CollapseLines;
  font_size?: FontSize;
  line_height?: LineHeight;
  tab_size?: TabSize;
  font_media_id?: FontMediaId;
  font_url?: FontUrl;
  font_info?: FontInfo | null;
}
export interface IconUrls {
  [k: string]: string;
}
export interface DeliveryState {
  node_id: NodeId;
  enabled: Enabled1;
  desired_revision: DesiredRevision;
  applied_revision: AppliedRevision1;
  status: Status;
  applied_at: AppliedAt;
  error: Error1;
}
export interface SaveSettings {
  expected_revision: ExpectedRevision6;
  value: PublicSettings;
}
export interface PublicResponsePolicyState {
  success?: Success12;
  code?: Code13;
  msg?: Msg12;
  data: PolicyState;
}
export interface PolicyState {
  node_id: NodeId1;
  source_epoch: SourceEpoch1;
  revision: Revision4;
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
  expected_revision: ExpectedRevision7;
  value: CachePolicy;
}
export interface PublicResponseNodeList {
  success?: Success13;
  code?: Code14;
  msg?: Msg13;
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
  revision: Revision5;
  value: Value;
}
export interface DeliveryReceipt {
  node_id: NodeId3;
  source_epoch: SourceEpoch3;
  resource: Resource1;
  revision: Revision6;
  digest: Digest;
  durable: Durable;
}
