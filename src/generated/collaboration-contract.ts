/* Generated from the backend public contract. Do not edit by hand. */

export type Id = string;
export type BlockId = string;
export type ClientId = number;
export type Id1 = string;
export type BlockId1 = string;
export type LeaseId = string;
export type Id2 = string;
export type BlockId2 = string;
export type LeaseId1 = string;
export type OperationId = string;
export type ExpectedHash = string;
export type Html = string;
export type Success = boolean;
export type Code = number;
export type Msg = string;
export type LeaseId2 = string;
export type Html1 = string;
export type ExpectedHash1 = string;
export type ExpiresAt = string;
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type OperationId1 = string;
export type CommittedSeq = number;
export type Payload = string;
export type Generation = number;
export type Success2 = boolean;
export type Code2 = number;
export type Msg2 = string;
export type Released = true;
export type Id3 = string;
export type Success3 = boolean;
export type Code3 = number;
export type Msg3 = string;
export type Ticket = string;
export type DraftId = string;
export type Epoch = string;
export type WsPath = string;
export type Protocol = "collab-1";
export type Id4 = string;
export type OperationId2 = string;
export type ExpectedRevision = number;
export type Epoch1 = string;
export type CommittedSeq1 = number;
export type Action = "save" | "publish" | "withdraw";
export type Visibility = "public" | "password";
export type OpensAt = string | null;
export type AccessPassword = string | null;
export type Success4 = boolean;
export type Code4 = number;
export type Msg4 = string;
export type Id5 = string;
export type TypeId = string;
export type Title = string;
export type Excerpt = string;
export type Preview = string;
export type Author = string;
export type Revision = number;
export type Status = "draft" | "trash";
export type IsDemo = boolean;
export type PublishedRevision = number | null;
export type PublicPath = string | null;
export type PublishedAt = string | null;
export type CreatedAt = string;
export type UpdatedAt = string;
export type Id6 = string;
export type Type = "markdown" | "html";
export type Content = string;
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
export type Visibility1 = "public" | "password";
export type OpensAt1 = string | null;
export type Original = string;
export type Webp = string;
export type Family = string;
export type Style = "normal" | "italic";
export type WeightMin = number;
export type WeightMax = number;
export type Format = "woff2" | "woff" | "truetype" | "opentype";
export type HasPassword = boolean;
export type CommittedSeq2 = number;
export type Type1 = "update";
export type Epoch2 = string;
export type UpdateId = string;
export type Payload1 = string;
export type Type2 = "presence";
export type BlockId3 = string | null;
export type Anchor = string;
export type Head = string;
export type Type3 =
  | "sync"
  | "update"
  | "ack"
  | "peers"
  | "error"
  | "revision"
  | "media"
  | "sources";
export type Epoch3 = string | null;
export type CommittedSeq3 = number | null;
export type Payload2 = string | null;
export type UpdateId1 = string | null;
export type Peers = Peer[] | null;
export type ConnectionId = string;
export type ClientId1 = number;
export type Name = string;
export type Color = string;
export type BlockId4 = string | null;
export type Revision1 = number | null;
export type Code5 = number | null;
export type Msg5 = string | null;
export type MediaUrls1 = {
  [k: string]: MediaURL;
} | null;
export type Sources = SourceState[] | null;
export type BlockId5 = string;
export type Generation1 = number;
export type ClientId2 = number | null;
export type ExpiresAt1 = string | null;
export type Type4 = "auth";
export type Ticket1 = string;
export type ClientId3 = number;
export type StateVector = string;

export interface CollaborationContract {
  source_acquire: SourceAcquire;
  source_command: SourceCommand;
  source_apply: SourceApply;
  source_acquired: PublicResponseSourceAcquired;
  source_applied: PublicResponseSourceApplied;
  source_released: PublicResponseSourceReleased;
  lookup: DraftLookup;
  ticket: PublicResponseTicketState;
  commit: CommitDraft;
  committed: PublicResponseCommittedDraft;
  update: ClientUpdate;
  presence: PresenceInput;
  frame: ServerFrame;
  auth: ClientAuth;
}
export interface SourceAcquire {
  id: Id;
  block_id: BlockId;
  client_id: ClientId;
}
export interface SourceCommand {
  id: Id1;
  block_id: BlockId1;
  lease_id: LeaseId;
}
export interface SourceApply {
  id: Id2;
  block_id: BlockId2;
  lease_id: LeaseId1;
  operation_id: OperationId;
  expected_hash: ExpectedHash;
  html: Html;
}
export interface PublicResponseSourceAcquired {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: SourceAcquired;
}
export interface SourceAcquired {
  lease_id: LeaseId2;
  html: Html1;
  expected_hash: ExpectedHash1;
  expires_at: ExpiresAt;
}
export interface PublicResponseSourceApplied {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: SourceApplied;
}
export interface SourceApplied {
  operation_id: OperationId1;
  committed_seq: CommittedSeq;
  payload: Payload;
  generation: Generation;
}
export interface PublicResponseSourceReleased {
  success?: Success2;
  code?: Code2;
  msg?: Msg2;
  data: SourceReleased;
}
export interface SourceReleased {
  released?: Released;
}
export interface DraftLookup {
  id: Id3;
}
export interface PublicResponseTicketState {
  success?: Success3;
  code?: Code3;
  msg?: Msg3;
  data: TicketState;
}
export interface TicketState {
  ticket: Ticket;
  draft_id: DraftId;
  epoch: Epoch;
  ws_path: WsPath;
  protocol?: Protocol;
}
export interface CommitDraft {
  id: Id4;
  operation_id: OperationId2;
  expected_revision: ExpectedRevision;
  epoch: Epoch1;
  committed_seq: CommittedSeq1;
  action?: Action;
  visibility?: Visibility;
  opens_at?: OpensAt;
  access_password?: AccessPassword;
}
export interface PublicResponseCommittedDraft {
  success?: Success4;
  code?: Code4;
  msg?: Msg4;
  data: CommittedDraft;
}
export interface CommittedDraft {
  draft: DraftDetail;
  committed_seq: CommittedSeq2;
}
export interface DraftDetail {
  id: Id5;
  type_id: TypeId;
  title: Title;
  excerpt: Excerpt;
  preview: Preview;
  author: Author;
  revision: Revision;
  status: Status;
  is_demo: IsDemo;
  published_revision?: PublishedRevision;
  public_path?: PublicPath;
  published_at?: PublishedAt;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
  body: Body;
  settings?: EditorSettings;
  media_urls?: MediaUrls;
  has_password?: HasPassword;
}
export interface DraftBlock {
  id: Id6;
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
  visibility?: Visibility1;
  opens_at?: OpensAt1;
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
export interface ClientUpdate {
  type?: Type1;
  epoch: Epoch2;
  update_id: UpdateId;
  payload: Payload1;
  rich_versions?: RichVersions;
}
export interface RichVersions {
  [k: string]: number;
}
export interface PresenceInput {
  type?: Type2;
  block_id?: BlockId3;
  cursor?: Cursor | null;
}
export interface Cursor {
  anchor: Anchor;
  head: Head;
}
export interface ServerFrame {
  type: Type3;
  epoch?: Epoch3;
  committed_seq?: CommittedSeq3;
  payload?: Payload2;
  update_id?: UpdateId1;
  peers?: Peers;
  revision?: Revision1;
  code?: Code5;
  msg?: Msg5;
  media_urls?: MediaUrls1;
  sources?: Sources;
}
export interface Peer {
  connection_id: ConnectionId;
  client_id: ClientId1;
  name: Name;
  color: Color;
  block_id?: BlockId4;
  cursor?: Cursor | null;
}
export interface SourceState {
  block_id: BlockId5;
  generation: Generation1;
  client_id: ClientId2;
  expires_at: ExpiresAt1;
}
export interface ClientAuth {
  type?: Type4;
  ticket: Ticket1;
  client_id: ClientId3;
  state_vector: StateVector;
}
