/* Generated from the backend public contract. Do not edit by hand. */

export type Success = boolean;
export type Code = number;
export type Msg = string;
export type Id = string;
export type Filename = string;
export type Url = string | null;
export type CreatedAt = string;
export type Status = "ready" | "pending" | "unavailable";
export type Reused = boolean;
export type Items = AvatarItem[];
export type MaxBytes = number;
export type MaxEdge = number;
export type DailyUploads = number;
export type RetainedImages = number;
export type Revision = number;
export type UploadedToday = number;
export type Retained = number;
export type ResetsAt = string;
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;
export type Success2 = boolean;
export type Code2 = number;
export type Msg2 = string;
export type OperationId = string;
export type ExpectedRevision = number;
export type MaxBytes1 = number;
export type MaxEdge1 = number;
export type DailyUploads1 = number;
export type RetainedImages1 = number;
export type CurrentPassword = string;
export type OperationId1 = string;
export type AvatarId = string;
export type UploadId = string;
export type Filename1 = string;
export type Success3 = boolean;
export type Code3 = number;
export type Msg3 = string;
export type DefaultCode = string;
export type Code4 = string;
export type Name = string;
export type Flag = string;
export type Prefix = string;
export type Enabled = boolean;
export type UiLocale = "zh-CN" | "en";
/**
 * @minItems 1
 */
export type Languages = LanguageDefinition[];
export type Page = number;
export type PageSize = number;
export type OperationId2 = string;
export type AppId = string;
export type Name1 = string;
export type ExpiresAt = string;
export type CurrentPassword1 = string;
export type OperationId3 = string;
export type KeyId = string;
export type Success4 = boolean;
export type Code5 = number;
export type Msg4 = string;
export type Id1 = string;
export type AppId1 = string;
export type ApplicationName = string;
export type Audience = string;
export type Name2 = string;
export type Masked = string;
export type Status1 = "active" | "revoked" | "expired" | "unavailable";
export type Revision1 = number;
export type CreatedAt1 = string;
export type ExpiresAt1 = string;
export type LastUsedAt = string | null;
export type RevokedAt = string | null;
export type Items1 = KeyState[];
export type Total = number;
export type Page1 = number;
export type PageSize1 = number;
export type Success5 = boolean;
export type Code6 = number;
export type Msg5 = string;
export type Secret = string | null;
export type Success6 = boolean;
export type Code7 = number;
export type Msg6 = string;
export type Id2 = string;
export type Name3 = string;
export type Audience1 = string;
export type Code8 = string;
export type Label = string;
export type ApiKey = boolean;
export type OwnerScope = boolean;
export type Scopes = PermissionDefinition[];
export type Applications = KeyApplication[];
export type OperationId4 = string;
export type AppId2 = string;
export type Audience2 = "everunfold" | "self";
export type Name4 = string;
export type Active = boolean;
export type CallbackUrl = string;
export type Code9 = string;
export type Label1 = string;
export type ApiKey1 = true;
export type OwnerScope1 = boolean;
/**
 * @maxItems 64
 */
export type Scopes1 = ApplicationScope[];
export type CurrentPassword2 = string;
export type OperationId5 = string;
export type ExpectedRevision1 = number;
export type CurrentPassword3 = string;
export type OperationId6 = string;
export type ExpectedRevision2 = number;
export type Direction = "query" | "callback" | "both";
export type CurrentPassword4 = string;
export type OperationId7 = string;
export type Action = "test" | "resync" | "retry";
export type Success7 = boolean;
export type Code10 = number;
export type Msg7 = string;
export type Id3 = string;
export type Name5 = string;
export type Audience3 = string;
export type Active1 = boolean;
export type CallbackUrl1 = string;
export type Scopes2 = PermissionDefinition[];
export type Revision2 = number;
export type AuthVersion = number;
export type QueryKeyId = string | null;
export type CallbackKeyId = string | null;
export type QueryUrl = string;
export type SigningAvailable = boolean;
export type Builtin = boolean;
export type Id4 = string;
export type EventType = string;
export type Status2 = "pending" | "delivered" | "failed" | "skipped";
export type Attempts = number;
export type CreatedAt2 = string;
export type ReceivedAt = string | null;
export type AppliedAt = string | null;
export type LastError = string;
export type Callbacks = CallbackState[];
export type Items2 = ApplicationState[];
export type Success8 = boolean;
export type Code11 = number;
export type Msg8 = string;
export type Success9 = boolean;
export type Code12 = number;
export type Msg9 = string;
export type QuerySecret = string | null;
export type CallbackSecret = string | null;
export type Q = string;
export type Page2 = number;
export type PageSize2 = number;
export type Active2 = boolean | null;
export type OperationId8 = string;
export type ExpectedRevision3 = number;
export type DisplayName = string;
export type Email = string;
export type AvatarUrl = string;
export type AvatarId1 = string | null;
export type Bio = string;
export type Website = string;
export type PreferredLocale = string;
export type OperationId9 = string;
export type Username = string;
export type DisplayName1 = string;
export type Password = string;
export type CurrentPassword5 = string;
export type Role = "admin" | "user";
export type OperationId10 = string;
export type ExpectedRevision4 = number;
export type Role1 = "admin" | "user";
export type Active3 = boolean;
export type CurrentPassword6 = string;
export type OperationId11 = string;
export type ExpectedRevision5 = number;
export type CurrentPassword7 = string;
export type NewPassword = string;
export type RevokeApiKeys = boolean;
export type OperationId12 = string;
export type ExpectedRevision6 = number;
export type CurrentPassword8 = string;
export type NewPassword1 = string;
export type OperationId13 = string;
export type SessionId = string;
export type Success10 = boolean;
export type Code13 = number;
export type Msg10 = string;
export type DisplayName2 = string;
export type Email1 = string;
export type AvatarUrl1 = string;
export type AvatarId2 = string | null;
export type Bio1 = string;
export type Website1 = string;
export type PreferredLocale1 = string;
export type Id5 = string;
export type Username1 = string;
export type Role2 = "admin" | "user";
export type Active4 = boolean;
export type Revision3 = number;
export type AuthVersion1 = number;
export type MustChangePassword = boolean;
export type EmailVerified = false;
export type CreatedAt3 = string;
export type UpdatedAt = string;
export type Success11 = boolean;
export type Code14 = number;
export type Msg11 = string;
export type Items3 = AccountProfile[];
export type Total1 = number;
export type Page3 = number;
export type PageSize3 = number;
export type Success12 = boolean;
export type Code15 = number;
export type Msg12 = string;
export type Id6 = string;
export type Current = boolean;
export type CreatedAt4 = string;
export type ExpiresAt2 = string;
export type Items4 = SessionItem[];
export type Success13 = boolean;
export type Code16 = number;
export type Msg13 = string;
export type Items5 = PermissionDefinition[];
export type Applications1 = KeyApplication[];
export type Success14 = boolean;
export type Code17 = number;
export type Msg14 = string;
export type Authenticated = boolean;
export type Id7 = string;
export type Username2 = string;
export type DisplayName3 = string;
export type Role3 = "admin" | "user";
export type AvatarUrl2 = string;
export type PreferredLocale2 = string;
export type MustChangePassword1 = boolean;
export type CsrfToken = string;
export type ExpiresAt3 = string;

export interface AccountContract {
  avatar_catalog: PublicResponseAvatarCatalog;
  avatar_item: PublicResponseAvatarItem;
  avatar_policy: PublicResponseAvatarPolicyState;
  avatar_policy_save: AvatarPolicySave;
  avatar_remove: AvatarRemove;
  avatar_upload: AvatarUpload;
  languages: PublicResponseLanguageCatalog;
  key_query: KeyQuery;
  key_create: KeyCreate;
  key_revoke: KeyRevoke;
  key_list: PublicResponseKeyList;
  key_mutation: PublicResponseKeyMutation;
  key_options: PublicResponseKeyOptions;
  application_create: ApplicationCreate;
  application_save: ApplicationSave;
  application_rotate: ApplicationRotate;
  callback_command: CallbackCommand;
  applications: PublicResponseApplicationList;
  application: PublicResponseApplicationState;
  application_mutation: PublicResponseApplicationMutation;
  user_query: AccountUserQuery;
  profile_save: ProfileSave;
  user_create: UserCreate;
  user_save: UserSave;
  password_change: PasswordChange;
  password_reset: PasswordReset;
  session_revoke: SessionRevoke;
  profile: PublicResponseAccountProfile;
  users: PublicResponseAccountUserList;
  sessions: PublicResponseSessionList;
  permissions: PublicResponsePermissionCatalog;
  session: PublicResponseAuthSessionState;
}
export interface PublicResponseAvatarCatalog {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: AvatarCatalog;
}
export interface AvatarCatalog {
  items: Items;
  policy: AvatarPolicyState;
  uploaded_today: UploadedToday;
  retained: Retained;
  resets_at: ResetsAt;
}
export interface AvatarItem {
  id: Id;
  filename: Filename;
  url: Url;
  created_at: CreatedAt;
  status: Status;
  reused?: Reused;
}
export interface AvatarPolicyState {
  max_bytes?: MaxBytes;
  max_edge?: MaxEdge;
  daily_uploads?: DailyUploads;
  retained_images?: RetainedImages;
  revision: Revision;
}
export interface PublicResponseAvatarItem {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: AvatarItem;
}
export interface PublicResponseAvatarPolicyState {
  success?: Success2;
  code?: Code2;
  msg?: Msg2;
  data: AvatarPolicyState;
}
export interface AvatarPolicySave {
  operation_id: OperationId;
  expected_revision: ExpectedRevision;
  value: AvatarLimits;
  current_password: CurrentPassword;
}
export interface AvatarLimits {
  max_bytes?: MaxBytes1;
  max_edge?: MaxEdge1;
  daily_uploads?: DailyUploads1;
  retained_images?: RetainedImages1;
}
export interface AvatarRemove {
  operation_id: OperationId1;
  avatar_id: AvatarId;
}
export interface AvatarUpload {
  upload_id: UploadId;
  filename: Filename1;
}
export interface PublicResponseLanguageCatalog {
  success?: Success3;
  code?: Code3;
  msg?: Msg3;
  data: LanguageCatalog;
}
export interface LanguageCatalog {
  default_code?: DefaultCode;
  languages?: Languages;
}
export interface LanguageDefinition {
  code: Code4;
  name: Name;
  flag?: Flag;
  prefix?: Prefix;
  enabled?: Enabled;
  ui_locale?: UiLocale;
}
export interface KeyQuery {
  page?: Page;
  page_size?: PageSize;
}
export interface KeyCreate {
  operation_id: OperationId2;
  app_id?: AppId;
  name: Name1;
  permissions: Permissions;
  expires_at: ExpiresAt;
  current_password: CurrentPassword1;
}
export interface Permissions {
  [k: string]: "own" | "all";
}
export interface KeyRevoke {
  operation_id: OperationId3;
  key_id: KeyId;
}
export interface PublicResponseKeyList {
  success?: Success4;
  code?: Code5;
  msg?: Msg4;
  data: KeyList;
}
export interface KeyList {
  items: Items1;
  total: Total;
  page?: Page1;
  page_size?: PageSize1;
}
export interface KeyState {
  id: Id1;
  app_id: AppId1;
  application_name: ApplicationName;
  audience: Audience;
  name: Name2;
  masked: Masked;
  permissions: Permissions1;
  effective_permissions: EffectivePermissions;
  status: Status1;
  revision: Revision1;
  created_at: CreatedAt1;
  expires_at: ExpiresAt1;
  last_used_at: LastUsedAt;
  revoked_at: RevokedAt;
}
export interface Permissions1 {
  [k: string]: "own" | "all";
}
export interface EffectivePermissions {
  [k: string]: "own" | "all";
}
export interface PublicResponseKeyMutation {
  success?: Success5;
  code?: Code6;
  msg?: Msg5;
  data: KeyMutation;
}
export interface KeyMutation {
  key: KeyState;
  secret?: Secret;
}
export interface PublicResponseKeyOptions {
  success?: Success6;
  code?: Code7;
  msg?: Msg6;
  data: KeyOptions;
}
export interface KeyOptions {
  applications: Applications;
}
export interface KeyApplication {
  id: Id2;
  name: Name3;
  audience: Audience1;
  permissions: Permissions2;
  scopes: Scopes;
}
export interface Permissions2 {
  [k: string]: "own" | "all";
}
export interface PermissionDefinition {
  code: Code8;
  label: Label;
  api_key: ApiKey;
  owner_scope: OwnerScope;
}
export interface ApplicationCreate {
  operation_id: OperationId4;
  app_id: AppId2;
  audience?: Audience2;
  value: ApplicationFields;
  current_password: CurrentPassword2;
}
export interface ApplicationFields {
  name: Name4;
  active?: Active;
  callback_url?: CallbackUrl;
  scopes?: Scopes1;
}
export interface ApplicationScope {
  code: Code9;
  label: Label1;
  api_key?: ApiKey1;
  owner_scope?: OwnerScope1;
}
export interface ApplicationSave {
  operation_id: OperationId5;
  expected_revision: ExpectedRevision1;
  value: ApplicationFields;
  current_password: CurrentPassword3;
}
export interface ApplicationRotate {
  operation_id: OperationId6;
  expected_revision: ExpectedRevision2;
  direction: Direction;
  current_password: CurrentPassword4;
}
export interface CallbackCommand {
  operation_id: OperationId7;
  action: Action;
}
export interface PublicResponseApplicationList {
  success?: Success7;
  code?: Code10;
  msg?: Msg7;
  data: ApplicationList;
}
export interface ApplicationList {
  items: Items2;
}
export interface ApplicationState {
  id: Id3;
  name: Name5;
  audience: Audience3;
  active: Active1;
  callback_url: CallbackUrl1;
  scopes: Scopes2;
  revision: Revision2;
  auth_version: AuthVersion;
  query_key_id: QueryKeyId;
  callback_key_id: CallbackKeyId;
  query_url: QueryUrl;
  signing_available: SigningAvailable;
  builtin: Builtin;
  callbacks: Callbacks;
}
export interface CallbackState {
  id: Id4;
  event_type: EventType;
  status: Status2;
  attempts: Attempts;
  created_at: CreatedAt2;
  received_at: ReceivedAt;
  applied_at: AppliedAt;
  last_error: LastError;
}
export interface PublicResponseApplicationState {
  success?: Success8;
  code?: Code11;
  msg?: Msg8;
  data: ApplicationState;
}
export interface PublicResponseApplicationMutation {
  success?: Success9;
  code?: Code12;
  msg?: Msg9;
  data: ApplicationMutation;
}
export interface ApplicationMutation {
  application: ApplicationState;
  query_secret?: QuerySecret;
  callback_secret?: CallbackSecret;
}
export interface AccountUserQuery {
  q?: Q;
  page?: Page2;
  page_size?: PageSize2;
  active?: Active2;
}
export interface ProfileSave {
  operation_id: OperationId8;
  expected_revision: ExpectedRevision3;
  value: ProfileFields;
}
export interface ProfileFields {
  display_name: DisplayName;
  email?: Email;
  avatar_url?: AvatarUrl;
  avatar_id?: AvatarId1;
  bio?: Bio;
  website?: Website;
  preferred_locale?: PreferredLocale;
}
export interface UserCreate {
  operation_id: OperationId9;
  username: Username;
  display_name: DisplayName1;
  password: Password;
  current_password: CurrentPassword5;
  role?: Role;
  grants?: Grants;
}
export interface Grants {
  [k: string]: {
    [k: string]: "own" | "all";
  };
}
export interface UserSave {
  operation_id: OperationId10;
  expected_revision: ExpectedRevision4;
  value: ProfileFields;
  role: Role1;
  active: Active3;
  grants?: Grants1;
  current_password?: CurrentPassword6;
}
export interface Grants1 {
  [k: string]: {
    [k: string]: "own" | "all";
  };
}
export interface PasswordChange {
  operation_id: OperationId11;
  expected_revision: ExpectedRevision5;
  current_password: CurrentPassword7;
  new_password: NewPassword;
  revoke_api_keys?: RevokeApiKeys;
}
export interface PasswordReset {
  operation_id: OperationId12;
  expected_revision: ExpectedRevision6;
  current_password: CurrentPassword8;
  new_password: NewPassword1;
}
export interface SessionRevoke {
  operation_id: OperationId13;
  session_id: SessionId;
}
export interface PublicResponseAccountProfile {
  success?: Success10;
  code?: Code13;
  msg?: Msg10;
  data: AccountProfile;
}
export interface AccountProfile {
  display_name: DisplayName2;
  email?: Email1;
  avatar_url?: AvatarUrl1;
  avatar_id?: AvatarId2;
  bio?: Bio1;
  website?: Website1;
  preferred_locale?: PreferredLocale1;
  id: Id5;
  username: Username1;
  role: Role2;
  active: Active4;
  revision: Revision3;
  auth_version: AuthVersion1;
  must_change_password: MustChangePassword;
  email_verified?: EmailVerified;
  grants: Grants2;
  created_at: CreatedAt3;
  updated_at: UpdatedAt;
}
export interface Grants2 {
  [k: string]: {
    [k: string]: "own" | "all";
  };
}
export interface PublicResponseAccountUserList {
  success?: Success11;
  code?: Code14;
  msg?: Msg11;
  data: AccountUserList;
}
export interface AccountUserList {
  items: Items3;
  total: Total1;
  page: Page3;
  page_size: PageSize3;
}
export interface PublicResponseSessionList {
  success?: Success12;
  code?: Code15;
  msg?: Msg12;
  data: SessionList;
}
export interface SessionList {
  items: Items4;
}
export interface SessionItem {
  id: Id6;
  current: Current;
  created_at: CreatedAt4;
  expires_at: ExpiresAt2;
}
export interface PublicResponsePermissionCatalog {
  success?: Success13;
  code?: Code16;
  msg?: Msg13;
  data: PermissionCatalog;
}
export interface PermissionCatalog {
  items: Items5;
  applications?: Applications1;
}
export interface PublicResponseAuthSessionState {
  success?: Success14;
  code?: Code17;
  msg?: Msg14;
  data: AuthSessionState;
}
export interface AuthSessionState {
  authenticated: Authenticated;
  user: AuthUser | null;
  csrf_token: CsrfToken;
  expires_at: ExpiresAt3;
}
export interface AuthUser {
  id: Id7;
  username: Username2;
  display_name: DisplayName3;
  role: Role3;
  permissions?: Permissions3;
  avatar_url?: AvatarUrl2;
  preferred_locale?: PreferredLocale2;
  must_change_password?: MustChangePassword1;
}
export interface Permissions3 {
  [k: string]: "own" | "all";
}
