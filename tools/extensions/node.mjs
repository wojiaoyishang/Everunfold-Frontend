/** Node CLI/tests use the same metadata discovery as Turbopack, without writing source files. */
import { register, createRequire } from "node:module";
import path from "node:path";
import { nodeCatalogSource } from "./node-catalog.mjs";
register(new URL("./node-loader.mjs", import.meta.url));
const require = createRequire(import.meta.url);
const previous = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  if (
    filename
      .replaceAll("\\", "/")
      .endsWith("/src/core/extensions/discovered.ts")
  ) {
    module._compile(
      nodeCatalogSource(path.resolve(path.dirname(filename), "../../.."), true),
      filename,
    );
  } else previous(module, filename);
};

// Test/CLI execution consumes the same independent packages as production.
const root = path.resolve(new URL("../../", import.meta.url).pathname);
const {
  readInstalledPlugins,
} = require("../../src/server/plugins/packages.ts");
const {
  installRuntimePlugins,
} = require("../../src/core/plugins/runtime/store.ts");
const installed = await readInstalledPlugins(
  process.env.PLUGINS_DIRECTORY ?? path.join(root, "plugins"),
  path.join(root, "var/cache/plugin-packages"),
);
installRuntimePlugins(
  installed.packages.map((item) => item.plugin),
  [],
  "node-preload",
);
