/* Generated from the backend public contract. Do not edit by hand. */

export type Success = boolean;
export type Code = number;
export type Msg = string;
export type Id = string;
export type Source = "custom" | "registered";
export type ImplementationId = string | null;
export type Title = string;
export type Path = string;
export type Description = string;
export type Revision = number;
export type AppliedRevision = number | null;
export type Enabled = boolean;
export type Available = boolean;
export type Archived = boolean;
export type UpdatedAt = string;
export type Items = ManagedPageSummary[];
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type Id1 = string;
export type Source1 = "custom" | "registered";
export type ImplementationId1 = string | null;
export type Revision1 = number;
export type AppliedRevision1 = number | null;
export type Enabled1 = boolean;
export type Title1 = string;
export type Path1 = string;
export type Description1 = string;
export type AllowIndexing = boolean;
export type Enabled2 = boolean;
export type Html = string;
export type Css = string;
export type Javascript = string;
export type JavascriptEnabled = boolean;
export type JsonValue = unknown;
export type Id2 = string;
export type Version = string;
export type Title2 = string;
export type Path2 = string;
export type Description2 = string;
export type Key = string;
export type Label = string;
export type Kind = "text" | "textarea" | "url" | "boolean" | "select" | "list";
export type MinLength = number;
export type MaxLength = number;
export type MaxItems = number;
/**
 * @maxItems 30
 */
export type Choices = string[];
/**
 * @maxItems 20
 */
export type Fields1 = PageOption[];
/**
 * @maxItems 30
 */
export type Fields = PageOption[];
export type Available1 = boolean;
export type UpdatedAt1 = string;
export type Archived1 = boolean;
export type Id3 = string;
export type ExpectedRevision = number;
export type Apply = boolean;
export type OperationId = string;
export type CurrentPassword = string;
export type Restore = boolean;
export type Id4 = string;
export type ExpectedRevision1 = number;
export type OperationId1 = string;
export type Protocol = "pages-1";
/**
 * @maxItems 100
 */
export type Pages = PageRegistration[];
export type Title3 = string;
export type Path3 = string;
export type Description3 = string;
export type AllowIndexing1 = boolean;
export type Enabled3 = true;
export type Html1 = string;
export type Css1 = string;
export type Javascript1 = string;
export type JavascriptEnabled1 = boolean;
export type Id5 = string;
export type Source2 = "custom" | "registered";
export type ImplementationId2 = string | null;
export type ImplementationVersion = string | null;
export type Revision2 = number;
export type Success2 = boolean;
export type Code2 = number;
export type Msg2 = string;
export type PageId = string;
export type Revision3 = number;
export type ExpectedRevision2 = number;
export type OperationId2 = string;

export interface PagesContract {
  catalog: PublicResponseManagedPageCatalog;
  item: PublicResponseManagedPageItem;
  save: SaveManagedPage;
  remove: RemoveManagedPage;
  manifest: PageManifest;
  public_page: PublicManagedPage;
  metadata: PublicResponsePageMetadata;
  save_metadata: SavePageMetadata;
}
export interface PublicResponseManagedPageCatalog {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: ManagedPageCatalog;
}
export interface ManagedPageCatalog {
  items: Items;
}
export interface ManagedPageSummary {
  id: Id;
  source: Source;
  implementation_id: ImplementationId;
  title: Title;
  path: Path;
  description: Description;
  revision: Revision;
  applied_revision: AppliedRevision;
  enabled: Enabled;
  available: Available;
  archived: Archived;
  updated_at: UpdatedAt;
}
export interface PublicResponseManagedPageItem {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: ManagedPageItem;
}
export interface ManagedPageItem {
  id: Id1;
  source: Source1;
  implementation_id: ImplementationId1;
  revision: Revision1;
  applied_revision: AppliedRevision1;
  enabled: Enabled1;
  value: PageValue;
  registration: PageRegistration | null;
  available: Available1;
  updated_at: UpdatedAt1;
  archived: Archived1;
}
export interface PageValue {
  title: Title1;
  path: Path1;
  description?: Description1;
  allow_indexing?: AllowIndexing;
  enabled?: Enabled2;
  html?: Html;
  css?: Css;
  javascript?: Javascript;
  javascript_enabled?: JavascriptEnabled;
  options?: Options;
}
export interface Options {
  [k: string]: JsonValue;
}
export interface PageRegistration {
  id: Id2;
  version: Version;
  title: Title2;
  path: Path2;
  description?: Description2;
  fields?: Fields;
}
export interface PageOption {
  key: Key;
  label: Label;
  kind: Kind;
  default?: JsonValue;
  min_length?: MinLength;
  choice_labels?: ChoiceLabels;
  max_length?: MaxLength;
  max_items?: MaxItems;
  choices?: Choices;
  fields?: Fields1;
}
export interface ChoiceLabels {
  [k: string]: string;
}
export interface SaveManagedPage {
  id: Id3;
  expected_revision: ExpectedRevision;
  value: PageValue;
  apply?: Apply;
  operation_id: OperationId;
  current_password?: CurrentPassword;
}
export interface RemoveManagedPage {
  restore?: Restore;
  id: Id4;
  expected_revision: ExpectedRevision1;
  operation_id: OperationId1;
}
export interface PageManifest {
  protocol?: Protocol;
  pages: Pages;
}
export interface PublicManagedPage {
  title: Title3;
  path: Path3;
  description?: Description3;
  allow_indexing?: AllowIndexing1;
  enabled?: Enabled3;
  html?: Html1;
  css?: Css1;
  javascript?: Javascript1;
  javascript_enabled?: JavascriptEnabled1;
  options?: Options1;
  id: Id5;
  source: Source2;
  implementation_id?: ImplementationId2;
  implementation_version?: ImplementationVersion;
  revision: Revision2;
}
export interface Options1 {
  [k: string]: JsonValue;
}
export interface PublicResponsePageMetadata {
  success?: Success2;
  code?: Code2;
  msg?: Msg2;
  data: PageMetadata;
}
export interface PageMetadata {
  page_id: PageId;
  revision: Revision3;
  value?: Value;
}
export interface Value {
  [k: string]: JsonValue;
}
export interface SavePageMetadata {
  expected_revision: ExpectedRevision2;
  operation_id: OperationId2;
  value?: Value1;
}
export interface Value1 {
  [k: string]: JsonValue;
}
