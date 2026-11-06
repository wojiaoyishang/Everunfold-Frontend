/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./pages-v1.schema.json";
import type { PagesContract } from "./pages-contract";
import {
  requestJSON,
  patchJSON,
  postJSON,
  type RequestOptions,
} from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "pages",
);

const readPageMetadataValidator = ajv.compile<PagesContract["metadata"]>({
  $ref: "pages#/properties/metadata",
});
export function readPageMetadata(
  baseUrl: string,
  pageId: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/pages/{page_id}/metadata".replace(
      "{page_id}",
      encodeURIComponent(pageId),
    ),
    {},
    readPageMetadataValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const savePageMetadataValidator = ajv.compile<PagesContract["metadata"]>({
  $ref: "pages#/properties/metadata",
});
export function savePageMetadata(
  baseUrl: string,
  pageId: string,
  input: PagesContract["save_metadata"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return patchJSON(
    baseUrl,
    "/v1/admin/pages/{page_id}/metadata".replace(
      "{page_id}",
      encodeURIComponent(pageId),
    ),
    input,
    savePageMetadataValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readManagedPageValidator = ajv.compile<PagesContract["item"]>({
  $ref: "pages#/properties/item",
});
export function readManagedPage(
  baseUrl: string,
  pageId: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/pages/{page_id}".replace(
      "{page_id}",
      encodeURIComponent(pageId),
    ),
    {},
    readManagedPageValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const readManagedPagesValidator = ajv.compile<PagesContract["catalog"]>({
  $ref: "pages#/properties/catalog",
});
export function readManagedPages(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/pages",
    {},
    readManagedPagesValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const saveManagedPageValidator = ajv.compile<PagesContract["item"]>({
  $ref: "pages#/properties/item",
});
export function saveManagedPage(
  baseUrl: string,
  input: PagesContract["save"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/pages/save",
    input,
    saveManagedPageValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const removeManagedPageValidator = ajv.compile<PagesContract["item"]>({
  $ref: "pages#/properties/item",
});
export function removeManagedPage(
  baseUrl: string,
  input: PagesContract["remove"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/pages/remove",
    input,
    removeManagedPageValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}
