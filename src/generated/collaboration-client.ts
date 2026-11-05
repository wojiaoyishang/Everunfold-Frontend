/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./collaboration-v1.schema.json";
import type { CollaborationContract } from "./collaboration-contract";
import { postJSON, type RequestOptions } from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "collaboration",
);

const acquireHtmlSourceValidator = ajv.compile<
  CollaborationContract["source_acquired"]
>({ $ref: "collaboration#/properties/source_acquired" });
export function acquireHtmlSource(
  baseUrl: string,
  input: CollaborationContract["source_acquire"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/collaboration/source/acquire",
    input,
    acquireHtmlSourceValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const renewHtmlSourceValidator = ajv.compile<
  CollaborationContract["source_acquired"]
>({ $ref: "collaboration#/properties/source_acquired" });
export function renewHtmlSource(
  baseUrl: string,
  input: CollaborationContract["source_command"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/collaboration/source/renew",
    input,
    renewHtmlSourceValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const releaseHtmlSourceValidator = ajv.compile<
  CollaborationContract["source_released"]
>({ $ref: "collaboration#/properties/source_released" });
export function releaseHtmlSource(
  baseUrl: string,
  input: CollaborationContract["source_command"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/collaboration/source/release",
    input,
    releaseHtmlSourceValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const applyHtmlSourceValidator = ajv.compile<
  CollaborationContract["source_applied"]
>({ $ref: "collaboration#/properties/source_applied" });
export function applyHtmlSource(
  baseUrl: string,
  input: CollaborationContract["source_apply"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/collaboration/source/apply",
    input,
    applyHtmlSourceValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const createCollaborationTicketValidator = ajv.compile<
  CollaborationContract["ticket"]
>({ $ref: "collaboration#/properties/ticket" });
export function createCollaborationTicket(
  baseUrl: string,
  input: CollaborationContract["lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/collaboration/ticket",
    input,
    createCollaborationTicketValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const commitCollaborationDraftValidator = ajv.compile<
  CollaborationContract["committed"]
>({ $ref: "collaboration#/properties/committed" });
export function commitCollaborationDraft(
  baseUrl: string,
  input: CollaborationContract["commit"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/collaboration/commit",
    input,
    commitCollaborationDraftValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const listDraftVersionsValidator = ajv.compile<
  CollaborationContract["version_catalog"]
>({ $ref: "collaboration#/properties/version_catalog" });
export function listDraftVersions(
  baseUrl: string,
  input: CollaborationContract["version_query"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/list",
    input,
    listDraftVersionsValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readDraftVersionValidator = ajv.compile<
  CollaborationContract["version_detail"]
>({ $ref: "collaboration#/properties/version_detail" });
export function readDraftVersion(
  baseUrl: string,
  input: CollaborationContract["version_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/read",
    input,
    readDraftVersionValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const deleteDraftVersionValidator = ajv.compile<
  CollaborationContract["version_deleted"]
>({ $ref: "collaboration#/properties/version_deleted" });
export function deleteDraftVersion(
  baseUrl: string,
  input: CollaborationContract["version_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/delete",
    input,
    deleteDraftVersionValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const uploadDraftBranchValidator = ajv.compile<
  CollaborationContract["branch_detail"]
>({ $ref: "collaboration#/properties/branch_detail" });
export function uploadDraftBranch(
  baseUrl: string,
  input: CollaborationContract["branch_upload"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/branch/upload",
    input,
    uploadDraftBranchValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readDraftBranchValidator = ajv.compile<
  CollaborationContract["branch_detail"]
>({ $ref: "collaboration#/properties/branch_detail" });
export function readDraftBranch(
  baseUrl: string,
  input: CollaborationContract["branch_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/branch/read",
    input,
    readDraftBranchValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const deleteDraftBranchValidator = ajv.compile<
  CollaborationContract["version_deleted"]
>({ $ref: "collaboration#/properties/version_deleted" });
export function deleteDraftBranch(
  baseUrl: string,
  input: CollaborationContract["branch_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/branch/delete",
    input,
    deleteDraftBranchValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const beginDraftMergeValidator = ajv.compile<
  CollaborationContract["merge_detail"]
>({ $ref: "collaboration#/properties/merge_detail" });
export function beginDraftMerge(
  baseUrl: string,
  input: CollaborationContract["merge_begin"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/merge/begin",
    input,
    beginDraftMergeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readDraftMergeValidator = ajv.compile<
  CollaborationContract["merge_detail"]
>({ $ref: "collaboration#/properties/merge_detail" });
export function readDraftMerge(
  baseUrl: string,
  input: CollaborationContract["merge_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/merge/read",
    input,
    readDraftMergeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const resolveDraftMergeValidator = ajv.compile<
  CollaborationContract["merge_detail"]
>({ $ref: "collaboration#/properties/merge_detail" });
export function resolveDraftMerge(
  baseUrl: string,
  input: CollaborationContract["merge_resolve"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/merge/resolve",
    input,
    resolveDraftMergeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const renewDraftMergeValidator = ajv.compile<
  CollaborationContract["merge_detail"]
>({ $ref: "collaboration#/properties/merge_detail" });
export function renewDraftMerge(
  baseUrl: string,
  input: CollaborationContract["merge_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/merge/renew",
    input,
    renewDraftMergeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const cancelDraftMergeValidator = ajv.compile<
  CollaborationContract["merge_detail"]
>({ $ref: "collaboration#/properties/merge_detail" });
export function cancelDraftMerge(
  baseUrl: string,
  input: CollaborationContract["merge_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/merge/cancel",
    input,
    cancelDraftMergeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const finishDraftMergeValidator = ajv.compile<
  CollaborationContract["merge_detail"]
>({ $ref: "collaboration#/properties/merge_detail" });
export function finishDraftMerge(
  baseUrl: string,
  input: CollaborationContract["merge_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/merge/finish",
    input,
    finishDraftMergeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const deleteDraftMergeValidator = ajv.compile<
  CollaborationContract["merge_detail"]
>({ $ref: "collaboration#/properties/merge_detail" });
export function deleteDraftMerge(
  baseUrl: string,
  input: CollaborationContract["merge_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/content/versions/merge/delete",
    input,
    deleteDraftMergeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}
