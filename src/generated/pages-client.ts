/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./pages-v1.schema.json";
import type { PagesContract } from "./pages-contract";
import {
  postJSON,
  requestJSON,
  patchJSON,
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

const setPageEnabledValidator = ajv.compile<PagesContract["item"]>({
  $ref: "pages#/properties/item",
});
export function setPageEnabled(
  baseUrl: string,
  input: PagesContract["set_enabled"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/pages/enabled",
    input,
    setPageEnabledValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readPageTranslationsValidator = ajv.compile<
  PagesContract["translations"]
>({ $ref: "pages#/properties/translations" });
export function readPageTranslations(
  baseUrl: string,
  input: PagesContract["translation_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/pages/translations/query",
    input,
    readPageTranslationsValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const createPageTranslationValidator = ajv.compile<
  PagesContract["translations"]
>({ $ref: "pages#/properties/translations" });
export function createPageTranslation(
  baseUrl: string,
  input: PagesContract["create_translation"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/pages/translations/create",
    input,
    createPageTranslationValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const linkPageTranslationValidator = ajv.compile<PagesContract["translations"]>(
  { $ref: "pages#/properties/translations" },
);
export function linkPageTranslation(
  baseUrl: string,
  input: PagesContract["link_translation"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/pages/translations/link",
    input,
    linkPageTranslationValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const unlinkPageTranslationValidator = ajv.compile<
  PagesContract["translations"]
>({ $ref: "pages#/properties/translations" });
export function unlinkPageTranslation(
  baseUrl: string,
  input: PagesContract["translation_mutation"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/pages/translations/unlink",
    input,
    unlinkPageTranslationValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const reviewPageTranslationValidator = ajv.compile<
  PagesContract["translations"]
>({ $ref: "pages#/properties/translations" });
export function reviewPageTranslation(
  baseUrl: string,
  input: PagesContract["translation_mutation"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/pages/translations/review",
    input,
    reviewPageTranslationValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

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
