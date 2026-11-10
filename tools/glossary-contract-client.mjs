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
const previewValidator = ajv.compile<GlossaryContract["preview_output"]>({
  $ref: "glossary#/properties/preview_output",
});
const publicHooksValidator = ajv.compile<GlossaryContract["public_hooks"]>({
  $ref: "glossary#/properties/public_hooks",
});
const hookListValidator = ajv.compile<GlossaryContract["hooks_query"]>({
  $ref: "glossary#/properties/hooks_query",
});
const hookItemValidator = ajv.compile<GlossaryContract["hook_detail"]>({
  $ref: "glossary#/properties/hook_detail",
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

export function readGlossaryHooksForTarget(
  baseUrl: string,
  query: {
    surface: "article" | "shuoshuo" | "page" | "code";
    content_id?: string;
    page_id?: string;
    language?: string;
  },
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/plugins/everunfold.glossary/hooks/for-target",
    query,
    publicHooksValidator,
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

export function previewGlossary(
  baseUrl: string,
  input: GlossaryContract["preview_input"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/plugins/everunfold.glossary/admin/preview",
    input,
    previewValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
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

export function queryGlossaryHooks(
  baseUrl: string,
  input: GlossaryContract["hook_query"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/plugins/everunfold.glossary/admin/hooks/query",
    input,
    hookListValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

export function readGlossaryHook(
  baseUrl: string,
  hookId: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    \`/v1/plugins/everunfold.glossary/admin/hooks/\${encodeURIComponent(hookId)}\`,
    {},
    hookItemValidator,
    { ...options, credentials: "include" },
  );
}

export function createGlossaryHook(
  baseUrl: string,
  input: GlossaryContract["hook_create"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    "/v1/plugins/everunfold.glossary/admin/hooks",
    input,
    hookItemValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

export function updateGlossaryHook(
  baseUrl: string,
  hookId: string,
  input: GlossaryContract["hook_update"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return patchJSON(
    baseUrl,
    \`/v1/plugins/everunfold.glossary/admin/hooks/\${encodeURIComponent(hookId)}\`,
    input,
    hookItemValidator,
    {
      ...options,
      credentials: "include",
      headers: { ...options.headers, "X-CSRF-Token": csrfToken },
    },
  );
}

export function archiveGlossaryHook(
  baseUrl: string,
  hookId: string,
  input: GlossaryContract["hook_archive"],
  csrfToken: string,
  options: RequestOptions = {},
) {
  return postJSON(
    baseUrl,
    \`/v1/plugins/everunfold.glossary/admin/hooks/\${encodeURIComponent(hookId)}/archive\`,
    input,
    hookItemValidator,
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
