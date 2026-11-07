import type { ThemeDefinition } from "./types";

const idPattern = /^[a-z][a-z0-9-]*$/;
const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]*$/;
function names(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every((name) => typeof name === "string" && namePattern.test(name)) &&
    new Set(value).size === value.length
  );
}

export function collectThemes(themes: readonly ThemeDefinition[]) {
  const byId = new Map<string, ThemeDefinition>();
  for (const theme of themes) {
    if (
      !idPattern.test(theme.id) ||
      byId.has(theme.id) ||
      !/^\d+\.\d+\.\d+$/.test(theme.version) ||
      !names(theme.components ?? []) ||
      (theme.parent !== undefined &&
        theme.parent !== null &&
        !idPattern.test(theme.parent)) ||
      (theme.styles !== undefined && typeof theme.styles !== "boolean") ||
      Object.entries(theme.templates ?? {}).some(
        ([key, value]) =>
          !namePattern.test(key) ||
          typeof value !== "string" ||
          !namePattern.test(value),
      ) ||
      Object.entries(theme.slots ?? {}).some(
        ([key, value]) =>
          !namePattern.test(key) || (value !== false && !names(value)),
      )
    )
      throw new Error(`Invalid or duplicate theme: ${theme.id}`);
    byId.set(
      theme.id,
      Object.freeze({
        ...theme,
        parent:
          theme.parent === undefined && theme.id !== "argon"
            ? "argon"
            : theme.parent,
        components: Object.freeze([...(theme.components ?? [])]),
        templates: Object.freeze({ ...theme.templates }),
        slots: Object.freeze(
          Object.fromEntries(
            Object.entries(theme.slots ?? {}).map(([key, value]) => [
              key,
              value === false ? (false as const) : Object.freeze([...value]),
            ]),
          ),
        ),
      }),
    );
  }
  const chains = new Map<string, readonly ThemeDefinition[]>();
  function chain(
    id: string,
    visiting: string[] = [],
  ): readonly ThemeDefinition[] {
    if (visiting.includes(id))
      throw new Error(
        `Cyclic theme inheritance: ${[...visiting, id].join(" -> ")}`,
      );
    const cached = chains.get(id);
    if (cached) return cached;
    const theme = byId.get(id);
    if (!theme) throw new Error(`Unknown theme or missing parent: ${id}`);
    const result = Object.freeze([
      theme,
      ...(theme.parent ? chain(theme.parent, [...visiting, id]) : []),
    ]);
    chains.set(id, result);
    return result;
  }
  for (const id of byId.keys()) chain(id);
  return {
    get: (id: string) => byId.get(id),
    chain: (id: string) => chain(id),
    owner: (id: string, name: string) =>
      chain(id).find((theme) => theme.components?.includes(name))?.id,
    templates(id: string, name: string, targets: readonly string[] = []) {
      return [...chain(id)].reverse().flatMap((theme) => {
        const key = [...targets, name].find((candidate) =>
          Object.hasOwn(theme.templates ?? {}, candidate),
        );
        return key
          ? [{ theme: theme.id, component: theme.templates![key] }]
          : [];
      });
    },
    slots(id: string, name: string) {
      let entries: { theme: string; component: string }[] = [];
      for (const theme of [...chain(id)].reverse()) {
        const slot = Object.hasOwn(theme.slots ?? {}, name)
          ? theme.slots![name]
          : undefined;
        if (slot === false) entries = [];
        else if (slot)
          entries.push(
            ...slot.map((component) => ({ theme: theme.id, component })),
          );
      }
      return entries;
    },
    all: Object.freeze([...byId.values()]),
  };
}
