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
export type SourceFirst = boolean;
export type Success3 = boolean;
export type Code3 = number;
export type Msg3 = string;
export type Ticket = string;
export type DraftId = string;
export type Epoch = string;
export type WsPath = string;
export type Protocol = "collab-1" | "collab-2";
export type Id4 = string;
export type OperationId2 = string;
export type ExpectedRevision = number;
export type Epoch1 = string;
export type CommittedSeq1 = number;
export type Action = "save" | "publish" | "withdraw";
export type Note = string;
export type Id5 = string;
export type Type = "markdown" | "html";
export type BaseHash = string;
export type Content = string;
/**
 * @maxItems 128
 */
export type BlockSources = BlockSourcePatch[];
export type Visibility = "public" | "password";
export type OpensAt = string | null;
export type AccessPassword = string | null;
export type Success4 = boolean;
export type Code4 = number;
export type Msg4 = string;
export type Id6 = string;
export type OwnerId = string | null;
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
export type Language = string;
export type TranslationGroupId = string | null;
export type Id7 = string;
export type Type1 = "markdown" | "html";
export type Content1 = string;
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
export type Type2 = "update";
export type Epoch2 = string;
export type UpdateId = string;
export type Payload1 = string;
export type Type3 = "presence";
export type BlockId3 = string | null;
export type Anchor = string;
export type Head = string;
export type Type4 =
  | "sync"
  | "update"
  | "ack"
  | "peers"
  | "error"
  | "revision"
  | "media"
  | "sources"
  | "control"
  | "reset";
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
export type Id8 = string;
export type ActorId = string;
export type Actor = string;
export type TargetSeq = number;
export type ExpiresAt2 = string;
export type Type5 = "auth";
export type Ticket1 = string;
export type ClientId3 = number;
export type StateVector = string;
export type Id9 = string;
export type Page = number;
export type BranchPage = number;
export type MergePage = number;
export type Id10 = string;
export type Revision2 = number;
export type Success5 = boolean;
export type Code6 = number;
export type Msg6 = string;
export type Revision3 = number;
export type Actor1 = string;
export type Action1 = string;
export type Note1 = string;
export type CreatedAt1 = string;
export type Epoch4 = string | null;
export type CommittedSeq4 = number | null;
export type Parents = number[];
export type Current = boolean;
export type BranchId = string | null;
export type Versions = VersionItem[];
export type Id11 = string;
export type Actor2 = string;
export type Note2 = string;
export type BaseRevision = number | null;
export type BaseEpoch = string | null;
export type BaseSeq = number | null;
export type CreatedAt2 = string;
export type MergedRevision = number | null;
export type ReviewBlocks = string[];
export type Branches = BranchItem[];
export type Total = number;
export type BranchTotal = number;
export type Page1 = number;
export type BranchPage1 = number;
export type PageSize = number;
export type Id12 = string;
export type BranchId1 = string;
export type OwnerId1 = string;
export type Actor3 = string;
export type Status1 =
  "active" | "cancelled" | "completed" | "expired" | "discarded";
export type CreatedAt3 = string;
export type ExpiresAt3 = string;
export type Unresolved = number;
export type ResultRevision = number | null;
export type Merges = MergeSummary[];
export type MergeTotal = number;
export type MergePage1 = number;
export type Success6 = boolean;
export type Code7 = number;
export type Msg7 = string;
export type Title1 = string;
export type Excerpt1 = string;
/**
 * @minItems 1
 * @maxItems 128
 */
export type Body1 = DraftBlock[];
export type AccessPassword1 = string | null;
export type Success7 = boolean;
export type Code8 = number;
export type Msg8 = string;
export type Deleted = true;
export type Id13 = string;
export type BranchId2 = string;
export type Note3 = string;
export type BaseEpoch1 = string | null;
export type BaseSeq1 = number | null;
export type BaseRevision1 = number | null;
export type BaseBranchId = string | null;
export type UpdateId2 = string;
export type Payload3 = string;
/**
 * @maxItems 1000
 */
export type Updates = BranchUpdate[];
/**
 * @maxItems 128
 */
export type ReviewBlocks1 = string[];
export type Id14 = string;
export type BranchId3 = string;
export type Success8 = boolean;
export type Code9 = number;
export type Msg9 = string;
export type Id15 = string;
export type BranchId4 = string;
export type MergeId = string;
export type Id16 = string;
export type MergeId1 = string;
export type Id17 = string;
export type MergeId2 = string;
export type Key = string;
export type Choice = "local" | "remote" | "base" | "custom";
/**
 * @maxItems 1024
 */
export type Resolutions = ConflictResolution[];
export type Success9 = boolean;
export type Code10 = number;
export type Msg10 = string;
export type Id18 = string;
export type BranchId5 = string;
export type Status2 =
  "active" | "cancelled" | "completed" | "expired" | "discarded";
export type OwnerId2 = string;
export type Epoch5 = string;
export type TargetSeq1 = number;
export type TargetRevision = number;
export type ExpiresAt4 = string;
export type Key1 = string;
export type Path1 = string[];
export type Kind = "text" | "field" | "block" | "order";
export type JsonValue = unknown;
export type Conflicts = MergeConflict[];
export type Resolved = string[];
export type ResultRevision1 = number | null;

export interface CollaborationContract {
  source_acquire: SourceAcquire;
  source_command: SourceCommand;
  source_apply: SourceApply;
  source_acquired: PublicResponseSourceAcquired;
  source_applied: PublicResponseSourceApplied;
  source_released: PublicResponseSourceReleased;
  lookup: TicketRequest;
  ticket: PublicResponseTicketState;
  commit: CommitDraft;
  committed: PublicResponseCommittedDraft;
  update: ClientUpdate;
  presence: PresenceInput;
  frame: ServerFrame;
  auth: ClientAuth;
  version_query: VersionQuery;
  version_lookup: VersionLookup;
  version_catalog: PublicResponseVersionCatalog;
  version_detail: PublicResponseVersionDetail;
  version_deleted: PublicResponseVersionDeleted;
  branch_upload: BranchUpload;
  branch_lookup: BranchLookup;
  branch_detail: PublicResponseBranchDetail;
  merge_begin: MergeBegin;
  merge_lookup: MergeLookup;
  merge_resolve: MergeResolve;
  merge_detail: PublicResponseMergeDetail;
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
export interface TicketRequest {
  id: Id3;
  source_first?: SourceFirst;
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
  note?: Note;
  block_sources?: BlockSources;
  visibility?: Visibility;
  opens_at?: OpensAt;
  access_password?: AccessPassword;
}
export interface BlockSourcePatch {
  id: Id5;
  type: Type;
  base_hash: BaseHash;
  content: Content;
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
  id: Id6;
  owner_id?: OwnerId;
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
  language?: Language;
  translation_group_id?: TranslationGroupId;
  body: Body;
  settings?: EditorSettings;
  media_urls?: MediaUrls;
  has_password?: HasPassword;
}
export interface DraftBlock {
  id: Id7;
  type?: Type1;
  content: Content1;
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
  type?: Type2;
  epoch: Epoch2;
  update_id: UpdateId;
  payload: Payload1;
  rich_versions?: RichVersions;
}
export interface RichVersions {
  [k: string]: number;
}
export interface PresenceInput {
  type?: Type3;
  block_id?: BlockId3;
  cursor?: Cursor | null;
}
export interface Cursor {
  anchor: Anchor;
  head: Head;
}
export interface ServerFrame {
  type: Type4;
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
  merge?: MergeLock | null;
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
export interface MergeLock {
  id: Id8;
  actor_id: ActorId;
  actor: Actor;
  target_seq: TargetSeq;
  expires_at: ExpiresAt2;
}
export interface ClientAuth {
  type?: Type5;
  ticket: Ticket1;
  client_id: ClientId3;
  state_vector: StateVector;
}
export interface VersionQuery {
  id: Id9;
  page?: Page;
  branch_page?: BranchPage;
  merge_page?: MergePage;
}
export interface VersionLookup {
  id: Id10;
  revision: Revision2;
}
export interface PublicResponseVersionCatalog {
  success?: Success5;
  code?: Code6;
  msg?: Msg6;
  data: VersionCatalog;
}
export interface VersionCatalog {
  versions: Versions;
  branches: Branches;
  total: Total;
  branch_total: BranchTotal;
  page: Page1;
  branch_page: BranchPage1;
  page_size?: PageSize;
  lock: MergeLock | null;
  merges: Merges;
  merge_total: MergeTotal;
  merge_page: MergePage1;
}
export interface VersionItem {
  revision: Revision3;
  actor: Actor1;
  action: Action1;
  note: Note1;
  created_at: CreatedAt1;
  epoch: Epoch4;
  committed_seq: CommittedSeq4;
  parents: Parents;
  current: Current;
  branch_id?: BranchId;
}
export interface BranchItem {
  id: Id11;
  actor: Actor2;
  note: Note2;
  base_revision: BaseRevision;
  base_epoch: BaseEpoch;
  base_seq: BaseSeq;
  created_at: CreatedAt2;
  merged_revision: MergedRevision;
  review_blocks?: ReviewBlocks;
}
export interface MergeSummary {
  id: Id12;
  branch_id: BranchId1;
  owner_id: OwnerId1;
  actor: Actor3;
  status: Status1;
  created_at: CreatedAt3;
  expires_at: ExpiresAt3;
  unresolved: Unresolved;
  result_revision: ResultRevision;
}
export interface PublicResponseVersionDetail {
  success?: Success6;
  code?: Code7;
  msg?: Msg7;
  data: VersionDetail;
}
export interface VersionDetail {
  version: VersionItem;
  fields: DraftFields;
  media_urls?: MediaUrls2;
}
export interface DraftFields {
  title?: Title1;
  excerpt?: Excerpt1;
  body: Body1;
  settings?: EditorSettings | null;
  access_password?: AccessPassword1;
}
export interface MediaUrls2 {
  [k: string]: MediaURL;
}
export interface PublicResponseVersionDeleted {
  success?: Success7;
  code?: Code8;
  msg?: Msg8;
  data: VersionDeleted;
}
export interface VersionDeleted {
  deleted?: Deleted;
}
export interface BranchUpload {
  id: Id13;
  branch_id: BranchId2;
  note?: Note3;
  base_epoch?: BaseEpoch1;
  base_seq?: BaseSeq1;
  base_revision?: BaseRevision1;
  base_branch_id?: BaseBranchId;
  fields: DraftFields;
  updates?: Updates;
  review_blocks?: ReviewBlocks1;
}
export interface BranchUpdate {
  update_id: UpdateId2;
  payload: Payload3;
}
export interface BranchLookup {
  id: Id14;
  branch_id: BranchId3;
}
export interface PublicResponseBranchDetail {
  success?: Success8;
  code?: Code9;
  msg?: Msg9;
  data: BranchDetail;
}
export interface BranchDetail {
  branch: BranchItem;
  base: DraftFields;
  fields: DraftFields;
  media_urls?: MediaUrls3;
}
export interface MediaUrls3 {
  [k: string]: MediaURL;
}
export interface MergeBegin {
  id: Id15;
  branch_id: BranchId4;
  merge_id: MergeId;
}
export interface MergeLookup {
  id: Id16;
  merge_id: MergeId1;
}
export interface MergeResolve {
  id: Id17;
  merge_id: MergeId2;
  resolutions: Resolutions;
  result?: DraftFields | null;
}
export interface ConflictResolution {
  key: Key;
  choice: Choice;
  value?: {
    [k: string]: unknown;
  };
}
export interface PublicResponseMergeDetail {
  success?: Success9;
  code?: Code10;
  msg?: Msg10;
  data: MergeDetail;
}
export interface MergeDetail {
  id: Id18;
  branch_id: BranchId5;
  status: Status2;
  owner_id: OwnerId2;
  epoch: Epoch5;
  target_seq: TargetSeq1;
  target_revision: TargetRevision;
  expires_at: ExpiresAt4;
  base: DraftFields;
  local: DraftFields;
  remote: DraftFields;
  result: DraftFields;
  conflicts: Conflicts;
  resolved: Resolved;
  result_revision: ResultRevision1;
  media_urls?: MediaUrls4;
}
export interface MergeConflict {
  key: Key1;
  path: Path1;
  kind: Kind;
  base: JsonValue;
  local: JsonValue;
  remote: JsonValue;
}
export interface MediaUrls4 {
  [k: string]: MediaURL;
}
