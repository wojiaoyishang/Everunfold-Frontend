/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./content-access-v1.schema.json";
import type { ContentAccessContract } from "./content-access-contract";
import { postJSON, type RequestOptions } from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "content-access",
);

const readProtectedContentValidator = ajv.compile<
  ContentAccessContract["response"]
>({ $ref: "content-access#/properties/response" });
export function readProtectedContent(
  baseUrl: string,
  input: ContentAccessContract["request"],
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/reader/access",
    input,
    readProtectedContentValidator,
    { ...options, credentials: "omit", headers: { ...options.headers } },
  );
}
