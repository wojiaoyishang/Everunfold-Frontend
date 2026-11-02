/* Generated from the backend public contract. Do not edit by hand. */

export type Id = string;
export type Success = boolean;
export type Code = number;
export type Msg = string;
export type Ticket = string;
export type DraftId = string;
export type Epoch = string;
export type WsPath = string;
export type Protocol = "collab-1";
export type Id1 = string;
export type OperationId = string;
export type ExpectedRevision = number;
export type Epoch1 = string;
export type CommittedSeq = number;
export type Action = "save" | "publish" | "withdraw";
export type Visibility = "public" | "password";
export type OpensAt = string | null;
export type AccessPassword = string | null;
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type Id2 = string;
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
export type Id3 = string;
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
export type HasPassword = boolean;
export type CommittedSeq1 = number;
export type Type1 = "update";
export type Epoch2 = string;
export type UpdateId = string;
export type Payload = string;
export type Type2 = "presence";
export type BlockId = string | null;
export type Anchor = string;
export type Head = string;
export type Type3 =
  "sync" | "update" | "ack" | "peers" | "error" | "revision" | "media";
export type Epoch3 = string | null;
export type CommittedSeq2 = number | null;
export type Payload1 = string | null;
export type UpdateId1 = string | null;
export type Peers = Peer[] | null;
export type ConnectionId = string;
export type ClientId = number;
export type Name = string;
export type Color = string;
export type BlockId1 = string | null;
export type Revision1 = number | null;
export type Code2 = number | null;
export type Msg2 = string | null;
export type MediaUrls1 = {
  [k: string]: MediaURL;
} | null;
export type Type4 = "auth";
export type Ticket1 = string;
export type ClientId1 = number;
export type StateVector = string;

export interface CollaborationContract {
  lookup: DraftLookup;
  ticket: PublicResponseTicketState;
  commit: CommitDraft;
  committed: PublicResponseCommittedDraft;
  update: ClientUpdate;
  presence: PresenceInput;
  frame: ServerFrame;
  auth: ClientAuth;
}
export interface DraftLookup {
  id: Id;
}
export interface PublicResponseTicketState {
  success?: Success;
  code?: Code;
  msg?: Msg;
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
  id: Id1;
  operation_id: OperationId;
  expected_revision: ExpectedRevision;
  epoch: Epoch1;
  committed_seq: CommittedSeq;
  action?: Action;
  visibility?: Visibility;
  opens_at?: OpensAt;
  access_password?: AccessPassword;
}
export interface PublicResponseCommittedDraft {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: CommittedDraft;
}
export interface CommittedDraft {
  draft: DraftDetail;
  committed_seq: CommittedSeq1;
}
export interface DraftDetail {
  id: Id2;
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
  visibility?: Visibility1;
  opens_at?: OpensAt1;
}
export interface MediaUrls {
  [k: string]: MediaURL;
}
export interface MediaURL {
  original: Original;
  webp?: Webp;
}
export interface ClientUpdate {
  type?: Type1;
  epoch: Epoch2;
  update_id: UpdateId;
  payload: Payload;
}
export interface PresenceInput {
  type?: Type2;
  block_id?: BlockId;
  cursor?: Cursor | null;
}
export interface Cursor {
  anchor: Anchor;
  head: Head;
}
export interface ServerFrame {
  type: Type3;
  epoch?: Epoch3;
  committed_seq?: CommittedSeq2;
  payload?: Payload1;
  update_id?: UpdateId1;
  peers?: Peers;
  revision?: Revision1;
  code?: Code2;
  msg?: Msg2;
  media_urls?: MediaUrls1;
}
export interface Peer {
  connection_id: ConnectionId;
  client_id: ClientId;
  name: Name;
  color: Color;
  block_id?: BlockId1;
  cursor?: Cursor | null;
}
export interface ClientAuth {
  type?: Type4;
  ticket: Ticket1;
  client_id: ClientId1;
  state_vector: StateVector;
}
