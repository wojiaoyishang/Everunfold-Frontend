/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./accounts-v1.schema.json";
import type { AccountContract } from "./accounts-contract";
import {
  requestJSON,
  postBinary,
  postJSON,
  patchJSON,
  type RequestOptions,
} from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "accounts",
);

const readAccountAvatarsValidator = ajv.compile<
  AccountContract["avatar_catalog"]
>({ $ref: "accounts#/properties/avatar_catalog" });
export function readAccountAvatars(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/account/avatars",
    {},
    readAccountAvatarsValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const uploadAccountAvatarValidator = ajv.compile<
  AccountContract["avatar_item"]
>({ $ref: "accounts#/properties/avatar_item" });
export function uploadAccountAvatar(
  baseUrl: string,
  input: AccountContract["avatar_upload"],
  file: Blob,
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postBinary(
    baseUrl,
    "/v1/account/avatars/upload",
    input,
    file,
    uploadAccountAvatarValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const removeAccountAvatarValidator = ajv.compile<
  AccountContract["avatar_catalog"]
>({ $ref: "accounts#/properties/avatar_catalog" });
export function removeAccountAvatar(
  baseUrl: string,
  input: AccountContract["avatar_remove"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/account/avatars/remove",
    input,
    removeAccountAvatarValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readAvatarPolicyValidator = ajv.compile<AccountContract["avatar_policy"]>(
  { $ref: "accounts#/properties/avatar_policy" },
);
export function readAvatarPolicy(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/users/avatar-policy",
    {},
    readAvatarPolicyValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const saveAvatarPolicyValidator = ajv.compile<AccountContract["avatar_policy"]>(
  { $ref: "accounts#/properties/avatar_policy" },
);
export function saveAvatarPolicy(
  baseUrl: string,
  input: AccountContract["avatar_policy_save"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return patchJSON(
    baseUrl,
    "/v1/admin/users/avatar-policy",
    input,
    saveAvatarPolicyValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readUserAvatarsValidator = ajv.compile<AccountContract["avatar_catalog"]>(
  { $ref: "accounts#/properties/avatar_catalog" },
);
export function readUserAvatars(
  baseUrl: string,
  userId: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/users/{user_id}/avatars".replace(
      "{user_id}",
      encodeURIComponent(userId),
    ),
    {},
    readUserAvatarsValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const removeUserAvatarValidator = ajv.compile<
  AccountContract["avatar_catalog"]
>({ $ref: "accounts#/properties/avatar_catalog" });
export function removeUserAvatar(
  baseUrl: string,
  userId: string,
  input: AccountContract["avatar_remove"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/users/{user_id}/avatars/remove".replace(
      "{user_id}",
      encodeURIComponent(userId),
    ),
    input,
    removeUserAvatarValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readAccountLanguagesValidator = ajv.compile<AccountContract["languages"]>(
  { $ref: "accounts#/properties/languages" },
);
export function readAccountLanguages(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/account/languages",
    {},
    readAccountLanguagesValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const readApiKeyOptionsValidator = ajv.compile<AccountContract["key_options"]>({
  $ref: "accounts#/properties/key_options",
});
export function readApiKeyOptions(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/account/api-keys/options",
    {},
    readApiKeyOptionsValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const readApiKeysValidator = ajv.compile<AccountContract["key_list"]>({
  $ref: "accounts#/properties/key_list",
});
export function readApiKeys(
  baseUrl: string,
  input: AccountContract["key_query"],
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/account/api-keys",
    input,
    readApiKeysValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const createApiKeyValidator = ajv.compile<AccountContract["key_mutation"]>({
  $ref: "accounts#/properties/key_mutation",
});
export function createApiKey(
  baseUrl: string,
  input: AccountContract["key_create"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/account/api-keys",
    input,
    createApiKeyValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const revokeApiKeyValidator = ajv.compile<AccountContract["key_list"]>({
  $ref: "accounts#/properties/key_list",
});
export function revokeApiKey(
  baseUrl: string,
  input: AccountContract["key_revoke"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/account/api-keys/revoke",
    input,
    revokeApiKeyValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readUserApiKeysValidator = ajv.compile<AccountContract["key_list"]>({
  $ref: "accounts#/properties/key_list",
});
export function readUserApiKeys(
  baseUrl: string,
  userId: string,
  input: AccountContract["key_query"],
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/users/{user_id}/api-keys".replace(
      "{user_id}",
      encodeURIComponent(userId),
    ),
    input,
    readUserApiKeysValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const revokeUserApiKeyValidator = ajv.compile<AccountContract["key_list"]>({
  $ref: "accounts#/properties/key_list",
});
export function revokeUserApiKey(
  baseUrl: string,
  userId: string,
  input: AccountContract["key_revoke"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/users/{user_id}/api-keys/revoke".replace(
      "{user_id}",
      encodeURIComponent(userId),
    ),
    input,
    revokeUserApiKeyValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readApiApplicationsValidator = ajv.compile<
  AccountContract["applications"]
>({ $ref: "accounts#/properties/applications" });
export function readApiApplications(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/api-key-applications",
    {},
    readApiApplicationsValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const createApiApplicationValidator = ajv.compile<
  AccountContract["application_mutation"]
>({ $ref: "accounts#/properties/application_mutation" });
export function createApiApplication(
  baseUrl: string,
  input: AccountContract["application_create"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/api-key-applications",
    input,
    createApiApplicationValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const saveApiApplicationValidator = ajv.compile<
  AccountContract["application_mutation"]
>({ $ref: "accounts#/properties/application_mutation" });
export function saveApiApplication(
  baseUrl: string,
  appId: string,
  input: AccountContract["application_save"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return patchJSON(
    baseUrl,
    "/v1/admin/api-key-applications/{app_id}".replace(
      "{app_id}",
      encodeURIComponent(appId),
    ),
    input,
    saveApiApplicationValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const rotateApiApplicationValidator = ajv.compile<
  AccountContract["application_mutation"]
>({ $ref: "accounts#/properties/application_mutation" });
export function rotateApiApplication(
  baseUrl: string,
  appId: string,
  input: AccountContract["application_rotate"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/api-key-applications/{app_id}/credentials".replace(
      "{app_id}",
      encodeURIComponent(appId),
    ),
    input,
    rotateApiApplicationValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const commandApiCallbackValidator = ajv.compile<AccountContract["application"]>(
  { $ref: "accounts#/properties/application" },
);
export function commandApiCallback(
  baseUrl: string,
  appId: string,
  input: AccountContract["callback_command"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/api-key-applications/{app_id}/callback".replace(
      "{app_id}",
      encodeURIComponent(appId),
    ),
    input,
    commandApiCallbackValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readAccountProfileValidator = ajv.compile<AccountContract["profile"]>({
  $ref: "accounts#/properties/profile",
});
export function readAccountProfile(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/account/profile",
    {},
    readAccountProfileValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const saveAccountProfileValidator = ajv.compile<AccountContract["profile"]>({
  $ref: "accounts#/properties/profile",
});
export function saveAccountProfile(
  baseUrl: string,
  input: AccountContract["profile_save"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return patchJSON(
    baseUrl,
    "/v1/account/profile",
    input,
    saveAccountProfileValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const changeAccountPasswordValidator = ajv.compile<AccountContract["session"]>({
  $ref: "accounts#/properties/session",
});
export function changeAccountPassword(
  baseUrl: string,
  input: AccountContract["password_change"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/account/password",
    input,
    changeAccountPasswordValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readAccountSessionsValidator = ajv.compile<AccountContract["sessions"]>({
  $ref: "accounts#/properties/sessions",
});
export function readAccountSessions(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/account/sessions",
    {},
    readAccountSessionsValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const revokeAccountSessionValidator = ajv.compile<AccountContract["sessions"]>({
  $ref: "accounts#/properties/sessions",
});
export function revokeAccountSession(
  baseUrl: string,
  input: AccountContract["session_revoke"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/account/sessions/revoke",
    input,
    revokeAccountSessionValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readAccountPermissionsValidator = ajv.compile<
  AccountContract["permissions"]
>({ $ref: "accounts#/properties/permissions" });
export function readAccountPermissions(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/account/permissions",
    {},
    readAccountPermissionsValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const readAccountUsersValidator = ajv.compile<AccountContract["users"]>({
  $ref: "accounts#/properties/users",
});
export function readAccountUsers(
  baseUrl: string,
  input: AccountContract["user_query"],
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/users",
    input,
    readAccountUsersValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const createAccountUserValidator = ajv.compile<AccountContract["profile"]>({
  $ref: "accounts#/properties/profile",
});
export function createAccountUser(
  baseUrl: string,
  input: AccountContract["user_create"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/users",
    input,
    createAccountUserValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readAccountUserValidator = ajv.compile<AccountContract["profile"]>({
  $ref: "accounts#/properties/profile",
});
export function readAccountUser(
  baseUrl: string,
  userId: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/users/{user_id}".replace(
      "{user_id}",
      encodeURIComponent(userId),
    ),
    {},
    readAccountUserValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const saveAccountUserValidator = ajv.compile<AccountContract["profile"]>({
  $ref: "accounts#/properties/profile",
});
export function saveAccountUser(
  baseUrl: string,
  userId: string,
  input: AccountContract["user_save"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return patchJSON(
    baseUrl,
    "/v1/admin/users/{user_id}".replace(
      "{user_id}",
      encodeURIComponent(userId),
    ),
    input,
    saveAccountUserValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const resetAccountUserPasswordValidator = ajv.compile<
  AccountContract["profile"]
>({ $ref: "accounts#/properties/profile" });
export function resetAccountUserPassword(
  baseUrl: string,
  userId: string,
  input: AccountContract["password_reset"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/users/{user_id}/password".replace(
      "{user_id}",
      encodeURIComponent(userId),
    ),
    input,
    resetAccountUserPasswordValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}
