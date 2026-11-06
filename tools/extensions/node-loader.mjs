import { fileURLToPath } from "node:url";
import path from "node:path";
import { nodeCatalogSource } from "./node-catalog.mjs";

export async function load(url, context, nextLoad) {
  if (!url.endsWith("/src/core/extensions/discovered.ts"))
    return nextLoad(url, context);
  const root = path.resolve(path.dirname(fileURLToPath(url)), "../../..");
  return {
    format: "module",
    shortCircuit: true,
    source: nodeCatalogSource(root),
  };
}
