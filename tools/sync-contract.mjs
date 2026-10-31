import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error(
    "Usage: npm run contract:sync -- <backend/contracts/public-v0.1.schema.json>",
  );
}
const absoluteSource = path.resolve(sourcePath);
const source = (await readFile(absoluteSource, "utf8")).replaceAll(
  "\r\n",
  "\n",
);
const schema = JSON.parse(source);
const presentation =
  path.basename(absoluteSource) === "presentation-v0.2.schema.json";
const reader =
  path.basename(absoluteSource) === "reader-preview-v0.1.schema.json";
const rootName = reader
  ? "ReaderPreviewContract"
  : presentation
    ? "ContentPresentation"
    : "PublicSnapshot";
const outputName = reader
  ? "reader-preview-contract"
  : presentation
    ? "presentation-contract"
    : "public-contract";
const backendRoot = path.dirname(path.dirname(absoluteSource));
const relativeSource = path
  .relative(backendRoot, absoluteSource)
  .replaceAll("\\", "/");
const committedSource = execFileSync(
  "git",
  ["show", `HEAD:${relativeSource}`],
  {
    cwd: backendRoot,
    encoding: "utf8",
  },
);
if (
  committedSource.replaceAll("\r\n", "\n") !== source.replaceAll("\r\n", "\n")
) {
  throw new Error(
    "Commit the authoritative backend contract before synchronizing it.",
  );
}
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: backendRoot,
  encoding: "utf8",
}).trim();
const output = path.join(projectRoot, "src/generated");
await mkdir(output, { recursive: true });
const types = await compile(schema, rootName, {
  bannerComment:
    "/* Generated from the backend public contract. Do not edit by hand. */",
  additionalProperties: false,
  ignoreMinAndMaxItems: reader,
  style: { singleQuote: false, semi: true, printWidth: 100 },
});
await writeFile(path.join(output, `${outputName}.ts`), types);
await writeFile(path.join(output, path.basename(absoluteSource)), source);
await writeFile(
  path.join(
    output,
    reader
      ? "reader-preview-source.json"
      : presentation
        ? "presentation-source.json"
        : "contract-source.json",
  ),
  `${JSON.stringify(
    {
      schema_version: schema["x-everunfold-contract-version"] ?? "0.1.0",
      source_repository: "https://github.com/wojiaoyishang/Everunfold-Backend",
      source_path: relativeSource,
      source_commit: commit,
      sha256: createHash("sha256").update(source).digest("hex"),
    },
    null,
    2,
  )}\n`,
);
if (reader) {
  const operations = schema["x-everunfold-operations"];
  if (
    !Array.isArray(operations) ||
    operations.some(
      (op) =>
        !/^readPreview[A-Za-z]+$/.test(op.name) ||
        !/^\/v1\/reader-preview\/[a-z]+$/.test(op.path) ||
        !schema.properties[op.query] ||
        !schema.properties[op.response],
    )
  )
    throw new Error("Invalid reader operation metadata");
  const functions = operations
    .map(
      (op) => `
const ${op.name}Validator = ajv.compile<ReaderPreviewContract[${JSON.stringify(op.response)}]>({
  $ref: ${JSON.stringify(`reader-preview#/properties/${op.response}`)},
});
export function ${op.name}(baseUrl: string, query: ReaderPreviewContract[${JSON.stringify(op.query)}], options: RequestOptions = {}) {
  return requestJSON(baseUrl, ${JSON.stringify(op.path)}, query, ${op.name}Validator, options);
}`,
    )
    .join("\n");
  await writeFile(
    path.join(output, "reader-preview-client.ts"),
    `/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./reader-preview-v0.1.schema.json";
import type { ReaderPreviewContract } from "./reader-preview-contract";
import { requestJSON, type RequestOptions } from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(Object.fromEntries(Object.entries(schema).filter(([key]) => !key.startsWith("x-"))), "reader-preview");
${functions}\n`,
  );
}
console.log(`Generated public contract from backend ${commit.slice(0, 7)}`);
