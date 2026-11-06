import { fileURLToPath } from "node:url";
import { readExtensionCatalog } from "./extensions/catalog";

const catalog = await readExtensionCatalog(
  fileURLToPath(new URL("../", import.meta.url)),
);
console.log(
  `Discovered ${catalog.plugins.length} plugins, ${catalog.themes.length} themes, ${catalog.pages.length} pages and ${catalog.registry.shortcodes.length} shortcodes.`,
);
