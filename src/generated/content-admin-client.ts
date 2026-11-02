/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./content-admin-v1.schema.json";
import type { ContentAdminContract } from "./content-admin-contract";
import {
  requestJSON,
  postJSON,
  type RequestOptions,
} from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "content-admin",
);

const readEditorOptionsValidator = ajv.compile<
  ContentAdminContract["editor_catalog"]
>({ $ref: "content-admin#/properties/editor_catalog" });
export function readEditorOptions(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/content/editor-options",
    {},
    readEditorOptionsValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const readContentTypesValidator = ajv.compile<ContentAdminContract["types"]>({
  $ref: "content-admin#/properties/types",
});
export function readContentTypes(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/content/types",
    {},
    readContentTypesValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const readContentSyncValidator = ajv.compile<
  ContentAdminContract["sync_state"]
>({ $ref: "content-admin#/properties/sync_state" });
export function readContentSync(baseUrl: string, options: RequestOptions = {}) {
  return requestJSON(
    baseUrl,
    "/v1/admin/content/publication",
    {},
    readContentSyncValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const retryContentSyncValidator = ajv.compile<
  ContentAdminContract["sync_state"]
>({ $ref: "content-admin#/properties/sync_state" });
export function retryContentSync(
  baseUrl: string,
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/sync",
    undefined,
    retryContentSyncValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const queryDraftsValidator = ajv.compile<ContentAdminContract["catalog"]>({
  $ref: "content-admin#/properties/catalog",
});
export function queryDrafts(
  baseUrl: string,
  input: ContentAdminContract["query"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/query",
    input,
    queryDraftsValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readDraftValidator = ajv.compile<ContentAdminContract["detail"]>({
  $ref: "content-admin#/properties/detail",
});
export function readDraft(
  baseUrl: string,
  input: ContentAdminContract["lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/detail",
    input,
    readDraftValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const createDraftValidator = ajv.compile<ContentAdminContract["detail"]>({
  $ref: "content-admin#/properties/detail",
});
export function createDraft(
  baseUrl: string,
  input: ContentAdminContract["create"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/create",
    input,
    createDraftValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const saveDraftValidator = ajv.compile<ContentAdminContract["detail"]>({
  $ref: "content-admin#/properties/detail",
});
export function saveDraft(
  baseUrl: string,
  input: ContentAdminContract["save"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/save",
    input,
    saveDraftValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const publishDraftValidator = ajv.compile<ContentAdminContract["detail"]>({
  $ref: "content-admin#/properties/detail",
});
export function publishDraft(
  baseUrl: string,
  input: ContentAdminContract["save"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/publish",
    input,
    publishDraftValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const withdrawDraftValidator = ajv.compile<ContentAdminContract["detail"]>({
  $ref: "content-admin#/properties/detail",
});
export function withdrawDraft(
  baseUrl: string,
  input: ContentAdminContract["mutation"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/withdraw",
    input,
    withdrawDraftValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const trashDraftValidator = ajv.compile<ContentAdminContract["detail"]>({
  $ref: "content-admin#/properties/detail",
});
export function trashDraft(
  baseUrl: string,
  input: ContentAdminContract["mutation"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/trash",
    input,
    trashDraftValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const restoreDraftValidator = ajv.compile<ContentAdminContract["detail"]>({
  $ref: "content-admin#/properties/detail",
});
export function restoreDraft(
  baseUrl: string,
  input: ContentAdminContract["mutation"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/restore",
    input,
    restoreDraftValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}
