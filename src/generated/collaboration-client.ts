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
