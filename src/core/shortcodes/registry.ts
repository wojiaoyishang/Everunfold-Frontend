import { pluginRegistry } from "@/core/plugins/registry";
import type { PublicShortcode, ShortcodeItem } from "@/core/contracts/settings";

export type CatalogItem = Omit<ShortcodeItem, "origin"> & {
  origin: "backend" | "frontend" | "custom";
};
/** Trusted frontend registrations share the catalog, but expose no write capability. */
export const frontendShortcodes = (): readonly CatalogItem[] =>
  pluginRegistry.shortcodes.map(({ definition, pluginId }) => ({
    id: definition.id,
    origin: "frontend",
    editable: false,
    revision: definition.revision,
    applied_revision: definition.revision,
    archived: false,
    source: {
      name: definition.name,
      title: definition.title,
      description: definition.description,
      kind: definition.kind,
      parameters: definition.parameters,
      html: definition.html || `由插件 ${pluginId} 的渲染器生成`,
      css: definition.css,
      example_body: "",
    },
    compiled: definition,
    versions: [],
  }));
export const builtinShortcodes = (): readonly PublicShortcode[] => [
  ...pluginRegistry.shortcodes.map((item) => item.definition),
];

export function shortcodeDefinitions(applied: readonly PublicShortcode[] = []) {
  const names = new Set<string>();
  const reservedNames = new Set(applied.map((item) => item.name));
  const reservedIds = new Set(applied.map((item) => item.id));
  return [
    ...applied,
    ...builtinShortcodes().filter(
      (item) => !reservedNames.has(item.name) && !reservedIds.has(item.id),
    ),
  ].map((item) => {
    if (names.has(item.name))
      throw new Error("Duplicate shortcode registration: " + item.name);
    names.add(item.name);
    return item;
  });
}

/** A private preview may replace an applied name before a new definition has its final ID. */
export function previewShortcodeDefinitions(
  definition: PublicShortcode,
  applied: readonly PublicShortcode[] = [],
) {
  // Frontend contributions must retain their renderer and optional sample view.
  // A persisted backend definition with the same identity remains authoritative.
  if (
    pluginRegistry.shortcode(definition) &&
    !applied.some(
      (item) => item.id === definition.id || item.name === definition.name,
    )
  )
    return applied;
  return [
    ...applied.filter(
      (item) => item.id !== definition.id && item.name !== definition.name,
    ),
    definition,
  ];
}
