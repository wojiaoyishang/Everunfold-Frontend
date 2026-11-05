/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./settings-v1.schema.json";
import type { SettingsContract } from "./settings-contract";
import {
  requestJSON,
  postJSON,
  postBinary,
  patchJSON,
  type RequestOptions,
} from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "settings",
);

const readShortcodesValidator = ajv.compile<
  SettingsContract["shortcode_catalog"]
>({ $ref: "settings#/properties/shortcode_catalog" });
export function readShortcodes(baseUrl: string, options: RequestOptions = {}) {
  return requestJSON(
    baseUrl,
    "/v1/admin/shortcodes",
    {},
    readShortcodesValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const saveShortcodeValidator = ajv.compile<SettingsContract["shortcode_item"]>({
  $ref: "settings#/properties/shortcode_item",
});
export function saveShortcode(
  baseUrl: string,
  input: SettingsContract["save_shortcode"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/shortcodes/save",
    input,
    saveShortcodeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const previewShortcodeValidator = ajv.compile<
  SettingsContract["shortcode_preview"]
>({ $ref: "settings#/properties/shortcode_preview" });
export function previewShortcode(
  baseUrl: string,
  input: SettingsContract["preview_shortcode"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/shortcodes/preview",
    input,
    previewShortcodeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const applyShortcodeValidator = ajv.compile<
  SettingsContract["shortcode_catalog"]
>({ $ref: "settings#/properties/shortcode_catalog" });
export function applyShortcode(
  baseUrl: string,
  input: SettingsContract["shortcode_action"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/shortcodes/apply",
    input,
    applyShortcodeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const archiveShortcodeValidator = ajv.compile<
  SettingsContract["shortcode_catalog"]
>({ $ref: "settings#/properties/shortcode_catalog" });
export function archiveShortcode(
  baseUrl: string,
  input: SettingsContract["shortcode_action"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/shortcodes/archive",
    input,
    archiveShortcodeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const restoreShortcodeValidator = ajv.compile<
  SettingsContract["shortcode_item"]
>({ $ref: "settings#/properties/shortcode_item" });
export function restoreShortcode(
  baseUrl: string,
  input: SettingsContract["restore_shortcode"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/shortcodes/restore",
    input,
    restoreShortcodeValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const queryFontsValidator = ajv.compile<SettingsContract["fonts"]>({
  $ref: "settings#/properties/fonts",
});
export function queryFonts(
  baseUrl: string,
  input: SettingsContract["icon_query"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/fonts/query",
    input,
    queryFontsValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const previewMediaRemovalValidator = ajv.compile<
  SettingsContract["media_removal_preview"]
>({ $ref: "settings#/properties/media_removal_preview" });
export function previewMediaRemoval(
  baseUrl: string,
  input: SettingsContract["media_removal_intent"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/media/remove-preview",
    input,
    previewMediaRemovalValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const removeMediaValidator = ajv.compile<SettingsContract["media_removal"]>({
  $ref: "settings#/properties/media_removal",
});
export function removeMedia(
  baseUrl: string,
  input: SettingsContract["media_remove"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/media/remove",
    input,
    removeMediaValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const restoreMediaValidator = ajv.compile<SettingsContract["media_removal"]>({
  $ref: "settings#/properties/media_removal",
});
export function restoreMedia(
  baseUrl: string,
  input: SettingsContract["media_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/media/restore",
    input,
    restoreMediaValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readMediaValidator = ajv.compile<SettingsContract["media_details"]>({
  $ref: "settings#/properties/media_details",
});
export function readMedia(
  baseUrl: string,
  input: SettingsContract["media_lookup"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/media/detail",
    input,
    readMediaValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const updateMediaValidator = ajv.compile<SettingsContract["media_details"]>({
  $ref: "settings#/properties/media_details",
});
export function updateMedia(
  baseUrl: string,
  input: SettingsContract["media_update"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/media/update",
    input,
    updateMediaValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const editMediaValidator = ajv.compile<SettingsContract["media_details"]>({
  $ref: "settings#/properties/media_details",
});
export function editMedia(
  baseUrl: string,
  input: SettingsContract["media_edit"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(baseUrl, "/v1/admin/media/edit", input, editMediaValidator, {
    ...options,
    credentials: "include",
    headers: { ...options.headers, "X-CSRF-Token": csrfToken },
  });
}

const queryMediaValidator = ajv.compile<SettingsContract["media_catalog"]>({
  $ref: "settings#/properties/media_catalog",
});
export function queryMedia(
  baseUrl: string,
  input: SettingsContract["media_query"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/media/query",
    input,
    queryMediaValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const uploadMediaValidator = ajv.compile<SettingsContract["media_item"]>({
  $ref: "settings#/properties/media_item",
});
export function uploadMedia(
  baseUrl: string,
  input: SettingsContract["media_upload"],
  file: Blob,
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postBinary(
    baseUrl,
    "/v1/admin/media/upload",
    input,
    file,
    uploadMediaValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const queryIconsValidator = ajv.compile<SettingsContract["icons"]>({
  $ref: "settings#/properties/icons",
});
export function queryIcons(
  baseUrl: string,
  input: SettingsContract["icon_query"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/icons/query",
    input,
    queryIconsValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const uploadIconValidator = ajv.compile<SettingsContract["icon"]>({
  $ref: "settings#/properties/icon",
});
export function uploadIcon(
  baseUrl: string,
  input: SettingsContract["icon_upload"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/icons/upload",
    input,
    uploadIconValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readSettingsValidator = ajv.compile<SettingsContract["settings"]>({
  $ref: "settings#/properties/settings",
});
export function readSettings(baseUrl: string, options: RequestOptions = {}) {
  return requestJSON(baseUrl, "/v1/admin/settings", {}, readSettingsValidator, {
    ...options,
    credentials: "include",
    headers: { ...options.headers },
  });
}

const saveSettingsValidator = ajv.compile<SettingsContract["settings"]>({
  $ref: "settings#/properties/settings",
});
export function saveSettings(
  baseUrl: string,
  input: SettingsContract["save_settings"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return patchJSON(
    baseUrl,
    "/v1/admin/settings",
    input,
    saveSettingsValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const readFrontendNodesValidator = ajv.compile<SettingsContract["nodes"]>({
  $ref: "settings#/properties/nodes",
});
export function readFrontendNodes(
  baseUrl: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/frontend-nodes",
    {},
    readFrontendNodesValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const readCachePolicyValidator = ajv.compile<SettingsContract["policy"]>({
  $ref: "settings#/properties/policy",
});
export function readCachePolicy(
  baseUrl: string,
  nodeId: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/admin/frontend-nodes/{node_id}/cache-policy".replace(
      "{node_id}",
      encodeURIComponent(nodeId),
    ),
    {},
    readCachePolicyValidator,
    { ...options, credentials: "include", headers: { ...options.headers } },
  );
}

const saveCachePolicyValidator = ajv.compile<SettingsContract["policy"]>({
  $ref: "settings#/properties/policy",
});
export function saveCachePolicy(
  baseUrl: string,
  nodeId: string,
  input: SettingsContract["save_policy"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return patchJSON(
    baseUrl,
    "/v1/admin/frontend-nodes/{node_id}/cache-policy".replace(
      "{node_id}",
      encodeURIComponent(nodeId),
    ),
    input,
    saveCachePolicyValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

const retrySettingsSyncValidator = ajv.compile<SettingsContract["nodes"]>({
  $ref: "settings#/properties/nodes",
});
export function retrySettingsSync(
  baseUrl: string,
  nodeId: string,
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/admin/frontend-nodes/{node_id}/sync".replace(
      "{node_id}",
      encodeURIComponent(nodeId),
    ),
    undefined,
    retrySettingsSyncValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}
