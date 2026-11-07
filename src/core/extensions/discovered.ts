import type { ThemeDefinition } from "./types";

/** Native Turbopack discovery: only reviewed local package entry points are executable. */
const themes = import.meta.glob<{ default: ThemeDefinition }>(
  "/src/themes/*/theme.ts",
  { eager: true },
);
export const themeModules = Object.fromEntries(
  Object.entries(themes).map(([key, module]) => [key, module.default]),
);
