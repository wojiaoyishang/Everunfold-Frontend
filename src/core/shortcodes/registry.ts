import registrations from "@/core/contracts/shortcode-builtins";
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
  ...registrations.map((item) => item.compiled as PublicShortcode),
  ...pluginRegistry.shortcodes.map((item) => item.definition),
];

export function shortcodeDefinitions(custom: readonly PublicShortcode[] = []) {
  const names = new Set<string>();
  return [
    ...builtinShortcodes(),
    ...custom.filter((item) => item.name.startsWith("custom:")),
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
  return [
    ...applied.filter(
      (item) => item.id !== definition.id && item.name !== definition.name,
    ),
    ...(definition.name.startsWith("custom:") ? [definition] : []),
  ];
}
