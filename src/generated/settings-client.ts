/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./settings-v1.schema.json";
import type { SettingsContract } from "./settings-contract";
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
  "settings",
);

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
