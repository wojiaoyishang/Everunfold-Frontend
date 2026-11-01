/* Generated from the backend public contract. Do not edit by hand. */

export type TypeId = string;
export type Search = string;
export type Status = "draft" | "trash";
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

export interface ContentAdminContract {
  query: DraftQuery;
  lookup: DraftLookup;
  create: DraftCreate;
  save: DraftSave;
  mutation: DraftMutation;
  catalog: PublicResponseDraftCatalog;
  detail: PublicResponseDraftDetail;
  types: PublicResponseContentTypeCatalog;
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
