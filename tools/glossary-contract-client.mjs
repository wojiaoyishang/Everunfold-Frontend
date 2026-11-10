import { writeArtifact } from "./write-artifact.mjs";

import path from "node:path";
import { format, resolveConfig } from "prettier";

/** Generate the first-party glossary client from backend operation metadata. */
export async function generateGlossaryClient(schema, output) {
  const operations = schema["x-everunfold-operations"];
  if (
    !Array.isArray(operations) ||
    operations.some(
      (operation) =>
        !/^[a-z][a-zA-Z]+$/.test(operation.name) ||
        !/^\/v1\/plugins\/everunfold\.glossary\/[a-z/{}_{}./-]+$/.test(
          operation.path,
        ) ||
        !["GET", "PATCH", "POST"].includes(operation.method) ||
        !schema.properties[operation.response] ||
        (operation.input && !schema.properties[operation.input]),
    )
  )
    throw new Error("Invalid glossary operation metadata");

  const target = path.join(output, "glossary-client.ts");
  const source = `/* Generated from the backend glossary contract. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./glossary-v1.schema.json";
import type { GlossaryContract } from "./glossary-contract";
import { patchJSON, postJSON, requestJSON, type RequestOptions } from "@/core/http/request";

const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(Object.entries(schema).filter(([key]) => !key.startsWith("x-"))),
  "glossary",
);
const publicIndexValidator = ajv.compile<GlossaryContract["public_index"]>({
  $ref: "glossary#/properties/public_index",
});
const publicDetailValidator = ajv.compile<GlossaryContract["public_detail"]>({
  $ref: "glossary#/properties/public_detail",
});
const contentMatchesValidator = ajv.compile<GlossaryContract["content_matches"]>({
  $ref: "glossary#/properties/content_matches",
});
const listValidator = ajv.compile<GlossaryContract["list"]>({
  $ref: "glossary#/properties/list",
});
const detailValidator = ajv.compile<GlossaryContract["detail"]>({
  $ref: "glossary#/properties/detail",
});

export function readGlossaryIndex(
  baseUrl: string,
  language?: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/plugins/everunfold.glossary/index",
    { language },
    publicIndexValidator,
    { ...options, credentials: "omit" },
  );
}

export function readGlossaryDetail(
  baseUrl: string,
  slug: string,
  language?: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    \`/v1/plugins/everunfold.glossary/terms/\${encodeURIComponent(slug)}\`,
    { language },
    publicDetailValidator,
    { ...options, credentials: "omit" },
  );
}

export function readContentGlossaryMatches(
  baseUrl: string,
  contentId: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    \`/v1/plugins/everunfold.glossary/for-content/\${encodeURIComponent(contentId)}\`,
    {},
    contentMatchesValidator,
    { ...options, credentials: "omit" },
  );
}

export function queryGlossaryTerms(
  baseUrl: string,
  input: GlossaryContract["query"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/plugins/everunfold.glossary/admin/query",
    input,
    listValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

export function readGlossaryTerm(
  baseUrl: string,
  termId: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    \`/v1/plugins/everunfold.glossary/admin/terms/\${encodeURIComponent(termId)}\`,
    {},
    detailValidator,
    { ...options, credentials: "include" },
  );
}

export function createGlossaryTerm(
  baseUrl: string,
  input: GlossaryContract["create"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/plugins/everunfold.glossary/admin/terms",
    input,
    detailValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

export function updateGlossaryTerm(
  baseUrl: string,
  termId: string,
  input: GlossaryContract["update"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return patchJSON(
    baseUrl,
    \`/v1/plugins/everunfold.glossary/admin/terms/\${encodeURIComponent(termId)}\`,
    input,
    detailValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}
`;
  await writeArtifact(
    target,
    await format(source, {
      ...(await resolveConfig(target)),
      filepath: target,
    }),
  );
}
