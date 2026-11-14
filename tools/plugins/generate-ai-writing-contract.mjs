import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { compile } from "json-schema-to-typescript";
import { format } from "prettier";

const [, , filename, mode] = process.argv;
if (!filename)
  throw new Error(
    "Pass the OpenAPI file from tools.export_plugin_routes --plugin-id core.ai-writing.",
  );
const input = await readFile(filename);
const document = JSON.parse(input);
if (document["x-everunfold-plugin"] !== "core.ai-writing")
  throw new Error("Expected the AI writing plugin contract.");
const aliases = {
  Configuration: "AiConfiguration",
  SaveConfiguration: "SaveAiConfiguration",
  Availability: "AiAvailability",
  GenerationRequest: "GenerateAiText",
  Generation: "AiGeneration",
  TestRequest: "TestAiConnection",
};
const definitions = document.components.schemas;
const properties = Object.fromEntries(
  Object.entries(aliases).map(([alias, name]) => {
    if (!definitions[name])
      throw new Error(`Missing AI writing model: ${name}`);
    return [alias, { $ref: `#/components/schemas/${name}` }];
  }),
);
const source = await compile(
  {
    type: "object",
    title: "AiWritingContract",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
    components: { schemas: definitions },
  },
  "AiWritingContract",
  {
    bannerComment: `/* Generated from the AI writing plugin OpenAPI. SHA256: ${createHash("sha256").update(input).digest("hex")} */`,
    additionalProperties: false,
    ignoreMinAndMaxItems: true,
  },
);
const output = new URL(
  "../../src/plugins/ai-writing/contract.ts",
  import.meta.url,
);
const contents = await format(
  source +
    Object.keys(aliases)
      .map(
        (alias) => `\nexport type ${alias} = AiWritingContract["${alias}"];\n`,
      )
      .join(""),
  { parser: "typescript" },
);
if (mode === "--check") {
  if ((await readFile(output, "utf8")) !== contents)
    throw new Error("The AI writing contract needs regeneration.");
} else await writeFile(output, contents);
