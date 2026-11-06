import { pluginModules } from "@/core/extensions/discovered";
import builtins from "@/core/contracts/shortcode-builtins";
import { createPluginRegistry } from "./create-registry";

export const pluginRegistry = createPluginRegistry(
  Object.values(pluginModules),
  builtins.map((item) => item.compiled),
);
