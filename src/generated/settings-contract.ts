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
export type Items = IconAsset[];
export type Page = number;
export type Total = number;
export type PageSize = number;
export type Query = string;
export type Page1 = number;
export type Filename = string;
export type DataBase64 = string;
export type UploadId = string;
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type Success2 = boolean;
export type Code2 = number;
export type Msg2 = string;
export type SourceEpoch = string;
export type Revision = number;
export type Name = string;
export type Description = string;
export type Author = string;
export type AvatarUrl = string;
export type Notice = string;
export type Id1 = string;
export type Label1 = string;
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
export type ExpectedRevision = number;
export type Success3 = boolean;
export type Code3 = number;
export type Msg3 = string;
export type NodeId1 = string;
export type SourceEpoch1 = string;
export type Revision1 = number;
export type DynamicFreshnessSeconds = number;
export type RequestTimeoutSeconds = number;
export type RetryDelayMs = number;
export type BatchDelayMs = number;
export type ExpectedRevision1 = number;
export type Success4 = boolean;
export type Code4 = number;
export type Msg4 = string;
export type Nodes = PolicyState[];
export type Protocol = "settings-1";
export type NodeId2 = string;
export type SourceEpoch2 = string;
export type Resource = "public-settings" | "cache-policy";
export type Revision2 = number;
export type Value = PublicSettings | CachePolicy;
export type NodeId3 = string;
export type SourceEpoch3 = string;
export type Resource1 = "public-settings" | "cache-policy";
export type Revision3 = number;
export type Digest = string;
export type Durable = true;

export interface SettingsContract {
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
export interface PublicResponseIconCatalog {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: IconCatalog;
}
export interface IconCatalog {
  items: Items;
  page: Page;
  total: Total;
  page_size?: PageSize;
}
export interface IconAsset {
  id: Id;
  label: Label;
  url: Url;
  mime: Mime;
  size: Size;
  created_at: CreatedAt;
}
export interface IconQuery {
  query?: Query;
  page?: Page1;
}
export interface IconUpload {
  filename: Filename;
  data_base64: DataBase64;
  upload_id: UploadId;
}
export interface PublicResponseIconAsset {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: IconAsset;
}
export interface PublicResponseSettingsState {
  success?: Success2;
  code?: Code2;
  msg?: Msg2;
  data: SettingsState;
}
export interface SettingsState {
  source_epoch: SourceEpoch;
  revision: Revision;
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
  description: Description;
  author: Author;
  avatar_url?: AvatarUrl;
  notice?: Notice;
  navigation?: Navigation;
  seo_description?: SeoDescription;
  title_template?: TitleTemplate;
  allow_indexing?: AllowIndexing;
}
export interface MenuItem {
  id: Id1;
  label: Label1;
  href: Href;
  icon?: Icon;
  children?: Children;
}
export interface ThemePreferences {
  accent?: Accent;
  mode?: Mode;
  hero_title?: HeroTitle;
  hero_subtitle?: HeroSubtitle;
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
  expected_revision: ExpectedRevision;
  value: PublicSettings;
}
export interface PublicResponsePolicyState {
  success?: Success3;
  code?: Code3;
  msg?: Msg3;
  data: PolicyState;
}
export interface PolicyState {
  node_id: NodeId1;
  source_epoch: SourceEpoch1;
  revision: Revision1;
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
  expected_revision: ExpectedRevision1;
  value: CachePolicy;
}
export interface PublicResponseNodeList {
  success?: Success4;
  code?: Code4;
  msg?: Msg4;
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
  revision: Revision2;
  value: Value;
}
export interface DeliveryReceipt {
  node_id: NodeId3;
  source_epoch: SourceEpoch3;
  resource: Resource1;
  revision: Revision3;
  digest: Digest;
  durable: Durable;
}
