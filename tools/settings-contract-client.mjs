import { writeFile } from "node:fs/promises";
import path from "node:path";
import { format, resolveConfig } from "prettier";

/** Emit operations from the backend contract; do not maintain parallel endpoint constants. */
export async function generateSettingsClient(schema, output) {
  const operations = schema["x-everunfold-operations"];
  if (
    !Array.isArray(operations) ||
    operations.some(
      (op) =>
        !/^[a-z][a-zA-Z]+$/.test(op.name) ||
        !/^\/v1\/admin\/[a-z/{}_-]+$/.test(op.path) ||
        !["GET", "PATCH", "POST"].includes(op.method) ||
        !schema.properties[op.response] ||
        (op.input && !schema.properties[op.input]) ||
        (op.encoding !== undefined && op.encoding !== "binary") ||
        (op.encoding === "binary" && (op.method !== "POST" || !op.input)),
    )
  )
    throw new Error("Invalid settings operation metadata");
  const methods = operations
    .map((op) => {
      const target = op.path.includes("{node_id}")
        ? `${JSON.stringify(op.path)}.replace("{node_id}", encodeURIComponent(nodeId))`
        : JSON.stringify(op.path);
      return `
const ${op.name}Validator = ajv.compile<SettingsContract[${JSON.stringify(op.response)}]>({ $ref: ${JSON.stringify(`settings#/properties/${op.response}`)} });
export function ${op.name}(baseUrl: string, ${op.path.includes("{node_id}") ? "nodeId: string, " : ""}${op.input ? `input: SettingsContract[${JSON.stringify(op.input)}], ` : ""}${op.encoding === "binary" ? "file: Blob, " : ""}${op.method !== "GET" ? "csrfToken: string, " : ""}options: RequestOptions = {}) {
  return ${op.encoding === "binary" ? "postBinary" : op.method === "GET" ? "requestJSON" : op.method === "PATCH" ? "patchJSON" : "postJSON"}(baseUrl, ${target}, ${op.input ? "input" : op.method === "GET" ? "{}" : "undefined"}, ${op.encoding === "binary" ? "file, " : ""}${op.name}Validator, { ...options, credentials: "include", headers: { ...options.headers${op.method !== "GET" ? ', "X-CSRF-Token": csrfToken' : ""} } });
}`;
    })
    .join("\n");
  const target = path.join(output, "settings-client.ts");
  const source = `/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./settings-v1.schema.json";
import type { SettingsContract } from "./settings-contract";
import { requestJSON, patchJSON, postJSON, postBinary, type RequestOptions } from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(Object.fromEntries(Object.entries(schema).filter(([key]) => !key.startsWith("x-"))), "settings");
${methods}
`;
  await writeFile(
    target,
    await format(source, {
      ...(await resolveConfig(target)),
      filepath: target,
    }),
  );
}
