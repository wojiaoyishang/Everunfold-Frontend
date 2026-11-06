import { mkdir, writeFile } from "node:fs/promises";
import { pageManifest } from "../src/core/pages/registry";
await mkdir(new URL("../registrations/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../registrations/pages-v1.json", import.meta.url),
  JSON.stringify(pageManifest, null, 2) + "\n",
);
console.log(
  `Exported ${pageManifest.pages.length} trusted page registrations.`,
);
