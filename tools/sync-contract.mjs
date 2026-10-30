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
const source = await readFile(absoluteSource, "utf8");
const schema = JSON.parse(source);
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
const types = await compile(schema, "PublicSnapshot", {
  bannerComment:
    "/* Generated from the backend public contract. Do not edit by hand. */",
  additionalProperties: false,
  style: { singleQuote: false, semi: true, printWidth: 100 },
});
await writeFile(path.join(output, "public-contract.ts"), types);
await writeFile(path.join(output, "public-v0.1.schema.json"), source);
await writeFile(
  path.join(output, "contract-source.json"),
  `${JSON.stringify(
    {
      schema_version: "0.1.0",
      source_repository: "https://github.com/wojiaoyishang/Everunfold-Backend",
      source_path: relativeSource,
      source_commit: commit,
      sha256: createHash("sha256").update(source).digest("hex"),
    },
    null,
    2,
  )}\n`,
);
console.log(`Generated public contract from backend ${commit.slice(0, 7)}`);
