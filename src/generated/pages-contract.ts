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
export type HasAppliedSnapshot = boolean;
export type HasUnappliedChanges = boolean;
/**
 * Legacy field; always false.
 */
export type EnableRequiresPassword = boolean;
export type AppliedJavascriptEnabled = boolean;
export type Language = string | null;
export type TranslationGroupId = string | null;
export type IsOriginal = boolean;
export type Id1 = string;
export type SourceId = string;
export type Revision1 = number;
export type Id2 = string;
export type Language1 = string;
export type Title1 = string;
export type Path1 = string;
export type Revision2 = number;
export type AppliedRevision1 = number | null;
export type Enabled1 = boolean;
export type Archived1 = boolean;
export type IsOriginal1 = boolean;
export type NeedsReview = boolean;
export type Members = PageTranslationMember[];
export type Items = ManagedPageSummary[];
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type Id3 = string;
export type Source1 = "custom" | "registered";
export type ImplementationId1 = string | null;
export type Revision3 = number;
export type AppliedRevision2 = number | null;
export type Enabled2 = boolean;
export type Title2 = string;
export type Path2 = string;
export type Description1 = string;
export type AllowIndexing = boolean;
export type Enabled3 = boolean;
export type Html = string;
export type Css = string;
export type Javascript = string;
export type JavascriptEnabled = boolean;
export type JsonValue = unknown;
export type Id4 = string;
export type Version = string;
export type Title3 = string;
export type Path3 = string;
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
export type Archived2 = boolean;
export type HasAppliedSnapshot1 = boolean;
export type HasUnappliedChanges1 = boolean;
/**
 * Legacy field; always false.
 */
export type EnableRequiresPassword1 = boolean;
export type AppliedJavascriptEnabled1 = boolean;
export type Language2 = string | null;
export type TranslationGroupId1 = string | null;
export type IsOriginal2 = boolean;
export type Id5 = string;
export type ExpectedRevision = number;
export type Apply = boolean;
export type OperationId = string;
/**
 * Legacy field; ignored.
 */
export type CurrentPassword = string;
export type Language3 = string | null;
export type Restore = boolean;
export type Id6 = string;
export type ExpectedRevision1 = number;
export type OperationId1 = string;
export type Protocol = "pages-1";
/**
 * @maxItems 100
 */
export type Pages = PageRegistration[];
export type Title4 = string;
export type Path4 = string;
export type Description3 = string;
export type AllowIndexing1 = boolean;
export type Enabled4 = true;
export type Html1 = string;
export type Css1 = string;
export type Javascript1 = string;
export type JavascriptEnabled1 = boolean;
export type Id7 = string;
export type Source2 = "custom" | "registered";
export type ImplementationId2 = string | null;
export type ImplementationVersion = string | null;
export type Revision4 = number;
export type Language4 = string | null;
export type TranslationGroupId2 = string | null;
export type IsOriginal3 = boolean;
export type Success2 = boolean;
export type Code2 = number;
export type Msg2 = string;
export type PageId = string;
export type Revision5 = number;
export type ExpectedRevision2 = number;
export type OperationId2 = string;
export type Id8 = string;
export type ExpectedRevision3 = number;
export type Enabled5 = boolean;
export type ApplyDraft = boolean;
export type OperationId3 = string;
/**
 * Legacy field; ignored.
 */
export type CurrentPassword1 = string;
export type Success3 = boolean;
export type Code3 = number;
export type Msg3 = string;
export type Id9 = string;
export type Id10 = string;
export type ExpectedRevision4 = number;
export type OperationId4 = string;
export type Id11 = string;
export type ExpectedRevision5 = number;
export type OperationId5 = string;
export type Language5 = string;
export type CopySource = boolean;
export type Id12 = string;
export type ExpectedRevision6 = number;
export type OperationId6 = string;
export type TargetId = string;

export interface PagesContract {
  catalog: PublicResponseManagedPageCatalog;
  item: PublicResponseManagedPageItem;
  save: SaveManagedPage;
  remove: RemoveManagedPage;
  manifest: PageManifest;
  public_page: PublicManagedPage;
  metadata: PublicResponsePageMetadata;
  save_metadata: SavePageMetadata;
  set_enabled: SetPageEnabled;
  translations: PublicResponsePageTranslationCatalog;
  translation_lookup: PageTranslationLookup;
  translation_mutation: PageTranslationMutation;
  create_translation: CreatePageTranslation;
  link_translation: LinkPageTranslation;
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
  has_applied_snapshot?: HasAppliedSnapshot;
  has_unapplied_changes?: HasUnappliedChanges;
  enable_requires_password?: EnableRequiresPassword;
  applied_javascript_enabled?: AppliedJavascriptEnabled;
  language?: Language;
  translation_group_id?: TranslationGroupId;
  is_original?: IsOriginal;
  translations?: PageTranslationCatalog | null;
}
export interface PageTranslationCatalog {
  id: Id1;
  source_id: SourceId;
  revision: Revision1;
  members: Members;
}
export interface PageTranslationMember {
  id: Id2;
  language: Language1;
  title: Title1;
  path: Path1;
  revision: Revision2;
  applied_revision: AppliedRevision1;
  enabled: Enabled1;
  archived: Archived1;
  is_original: IsOriginal1;
  needs_review: NeedsReview;
}
export interface PublicResponseManagedPageItem {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: ManagedPageItem;
}
export interface ManagedPageItem {
  id: Id3;
  source: Source1;
  implementation_id: ImplementationId1;
  revision: Revision3;
  applied_revision: AppliedRevision2;
  enabled: Enabled2;
  value: PageValue;
  registration: PageRegistration | null;
  available: Available1;
  updated_at: UpdatedAt1;
  archived: Archived2;
  has_applied_snapshot?: HasAppliedSnapshot1;
  has_unapplied_changes?: HasUnappliedChanges1;
  enable_requires_password?: EnableRequiresPassword1;
  applied_javascript_enabled?: AppliedJavascriptEnabled1;
  language?: Language2;
  translation_group_id?: TranslationGroupId1;
  is_original?: IsOriginal2;
  translations?: PageTranslationCatalog | null;
}
export interface PageValue {
  title: Title2;
  path: Path2;
  description?: Description1;
  allow_indexing?: AllowIndexing;
  enabled?: Enabled3;
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
  id: Id4;
  version: Version;
  title: Title3;
  path: Path3;
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
  id: Id5;
  expected_revision: ExpectedRevision;
  value: PageValue;
  apply?: Apply;
  operation_id: OperationId;
  current_password?: CurrentPassword;
  language?: Language3;
}
export interface RemoveManagedPage {
  restore?: Restore;
  id: Id6;
  expected_revision: ExpectedRevision1;
  operation_id: OperationId1;
}
export interface PageManifest {
  protocol?: Protocol;
  pages: Pages;
}
export interface PublicManagedPage {
  title: Title4;
  path: Path4;
  description?: Description3;
  allow_indexing?: AllowIndexing1;
  enabled?: Enabled4;
  html?: Html1;
  css?: Css1;
  javascript?: Javascript1;
  javascript_enabled?: JavascriptEnabled1;
  options?: Options1;
  id: Id7;
  source: Source2;
  implementation_id?: ImplementationId2;
  implementation_version?: ImplementationVersion;
  revision: Revision4;
  language?: Language4;
  translation_group_id?: TranslationGroupId2;
  is_original?: IsOriginal3;
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
  revision: Revision5;
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
export interface SetPageEnabled {
  id: Id8;
  expected_revision: ExpectedRevision3;
  enabled: Enabled5;
  apply_draft?: ApplyDraft;
  operation_id: OperationId3;
  current_password?: CurrentPassword1;
}
export interface PublicResponsePageTranslationCatalog {
  success?: Success3;
  code?: Code3;
  msg?: Msg3;
  data: PageTranslationCatalog;
}
export interface PageTranslationLookup {
  id: Id9;
}
export interface PageTranslationMutation {
  id: Id10;
  expected_revision: ExpectedRevision4;
  operation_id: OperationId4;
}
export interface CreatePageTranslation {
  id: Id11;
  expected_revision: ExpectedRevision5;
  operation_id: OperationId5;
  language: Language5;
  copy_source?: CopySource;
}
export interface LinkPageTranslation {
  id: Id12;
  expected_revision: ExpectedRevision6;
  operation_id: OperationId6;
  target_id: TargetId;
}
