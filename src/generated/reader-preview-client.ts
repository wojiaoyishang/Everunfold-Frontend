/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./reader-preview-v0.1.schema.json";
import type { ReaderPreviewContract } from "./reader-preview-contract";
import { requestJSON, type RequestOptions } from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "reader-preview",
);

const readPreviewIdentityValidator = ajv.compile<
  ReaderPreviewContract["identity"]
>({
  $ref: "reader-preview#/properties/identity",
});
export function readPreviewIdentity(
  baseUrl: string,
  query: ReaderPreviewContract["identity_query"],
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/reader-preview/identity",
    query,
    readPreviewIdentityValidator,
    options,
  );
}

const readPreviewMetricsValidator = ajv.compile<
  ReaderPreviewContract["metrics"]
>({
  $ref: "reader-preview#/properties/metrics",
});
export function readPreviewMetrics(
  baseUrl: string,
  query: ReaderPreviewContract["metrics_query"],
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/reader-preview/metrics",
    query,
    readPreviewMetricsValidator,
    options,
  );
}
