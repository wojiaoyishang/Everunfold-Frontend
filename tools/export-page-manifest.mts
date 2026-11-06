/** Print trusted declarations to stdout; no intermediate registrations directory. */
import { fileURLToPath } from "node:url";
import { readExtensionCatalog } from "./extensions/catalog";

const { manifest } = await readExtensionCatalog(
  fileURLToPath(new URL("../", import.meta.url)),
);
process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
