import type { ThemeDefinition } from "./types";

export function collectThemes(themes: readonly ThemeDefinition[]) {
  const byId = new Map<string, ThemeDefinition>();
  for (const theme of themes) {
    if (
      !/^[a-z][a-z0-9-]*$/.test(theme.id) ||
      byId.has(theme.id) ||
      !/^\d+\.\d+\.\d+$/.test(theme.version) ||
      new Set(theme.components).size !== theme.components.length
    )
      throw new Error(`Invalid or duplicate theme: ${theme.id}`);
    byId.set(theme.id, theme);
  }
  return {
    get: (id: string) => byId.get(id),
    all: Object.freeze([...byId.values()]),
  };
}
