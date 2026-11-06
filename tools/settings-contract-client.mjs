import { writeArtifact } from "./write-artifact.mjs";

import path from "node:path";
import { format, resolveConfig } from "prettier";

/** Emit operations from the backend contract; do not maintain parallel endpoint constants. */
export async function generateSettingsClient(
  schema,
  output,
  {
    contractName = "SettingsContract",
    stem = "settings",
    schemaFile = "settings-v1.schema.json",
  } = {},
) {
  const operations = schema["x-everunfold-operations"];
  if (
    !Array.isArray(operations) ||
    operations.some(
      (op) =>
        !/^[a-z][a-zA-Z]+$/.test(op.name) ||
        !(stem === "content-access"
          ? op.path === "/v1/reader/access"
          : stem === "accounts"
            ? /^\/v1\/(?:account|admin\/users|admin\/user-presets|admin\/api-key-applications)(?:\/[a-z/{}_-]+)?$/.test(
                op.path,
              )
            : /^\/v1\/admin\/[a-z/{}_-]+$/.test(op.path)) ||
        !["GET", "PATCH", "POST"].includes(op.method) ||
        !schema.properties[op.response] ||
        (op.input && !schema.properties[op.input]) ||
        (op.encoding !== undefined && op.encoding !== "binary") ||
        (op.encoding === "binary" && (op.method !== "POST" || !op.input)) ||
        (op.csrf === false && stem !== "content-access") ||
        (op.credentials === "omit" && stem !== "content-access"),
    )
  )
    throw new Error("Invalid settings operation metadata");
  const methods = operations
    .map((op) => {
      const parameters = [...op.path.matchAll(/\{([a-z][a-z_]*)\}/g)].map(
        (match) => ({
          name: match[1],
          argument: match[1].replace(/_([a-z])/g, (_, letter) =>
            letter.toUpperCase(),
          ),
        }),
      );
      const target =
        JSON.stringify(op.path) +
        parameters
          .map(
            ({ name, argument }) =>
              `.replace(${JSON.stringify(`{${name}}`)}, encodeURIComponent(${argument}))`,
          )
          .join("");
      return `
const ${op.name}Validator = ajv.compile<${contractName}[${JSON.stringify(op.response)}]>({ $ref: ${JSON.stringify(`${stem}#/properties/${op.response}`)} });
export function ${op.name}(baseUrl: string, ${parameters.map(({ argument }) => `${argument}: string, `).join("")}${op.input ? `input: ${contractName}[${JSON.stringify(op.input)}], ` : ""}${op.encoding === "binary" ? "file: Blob, " : ""}${op.method !== "GET" && op.csrf !== false ? "csrfToken: string, " : ""}options: RequestOptions = {}) {
  return ${op.encoding === "binary" ? "postBinary" : op.method === "GET" ? "requestJSON" : op.method === "PATCH" ? "patchJSON" : "postJSON"}(baseUrl, ${target}, ${op.input ? "input" : op.method === "GET" ? "{}" : "undefined"}, ${op.encoding === "binary" ? "file, " : ""}${op.name}Validator, { ...options, credentials: ${JSON.stringify(op.credentials ?? "include")}, headers: { ...options.headers${op.method !== "GET" && op.csrf !== false ? ', "X-CSRF-Token": csrfToken' : ""} } });
}`;
    })
    .join("\n");
  const target = path.join(output, `${stem}-client.ts`);
  const imports = [
    ...new Set(
      operations.map((op) =>
        op.encoding === "binary"
          ? "postBinary"
          : op.method === "GET"
            ? "requestJSON"
            : op.method === "PATCH"
              ? "patchJSON"
              : "postJSON",
      ),
    ),
  ];
  const source = `/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./${schemaFile}";
import type { ${contractName} } from "./${stem}-contract";
import { ${imports.join(", ")}, type RequestOptions } from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(Object.fromEntries(Object.entries(schema).filter(([key]) => !key.startsWith("x-"))), "${stem}");
${methods}
`;
  await writeArtifact(
    target,
    await format(source, {
      ...(await resolveConfig(target)),
      filepath: target,
    }),
  );
}
