import type { FrontendPlugin } from "@/core/plugins/types";
import type { ThemeDefinition } from "./types";

/** Native Turbopack discovery: only reviewed local package entry points are executable. */
const plugins = import.meta.glob<{ default: FrontendPlugin }>(
  "/src/plugins/*/plugin.ts",
  { eager: true },
);
const themes = import.meta.glob<{ default: ThemeDefinition }>(
  "/src/themes/*/theme.ts",
  { eager: true },
);
export const pluginModules = Object.fromEntries(
  Object.entries(plugins).map(([key, module]) => [key, module.default]),
);
export const themeModules = Object.fromEntries(
  Object.entries(themes).map(([key, module]) => [key, module.default]),
);
