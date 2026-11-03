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
