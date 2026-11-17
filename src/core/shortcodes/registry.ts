import { pluginRegistry } from "@/core/plugins/registry";
import type { PublicShortcode, ShortcodeItem } from "@/core/contracts/settings";

import { regionKind, regionNames } from "./region-definitions";
import { glossaryPopupName, glossaryShortcode } from "./glossary";
import { parseShortcodes } from "./parser";

export { regionKind } from "./region-definitions";

export type CatalogItem = Omit<ShortcodeItem, "origin"> & {
  origin: "backend" | "frontend" | "custom";
};
/** Trusted frontend registrations share the catalog, but expose no write capability. */
export const frontendShortcodes = (): readonly CatalogItem[] =>
  [
    { definition: glossaryShortcode, pluginId: "Everunfold" },
    ...pluginRegistry.shortcodes.filter(
      ({ definition }) =>
        !regionKind(definition.name) &&
        definition.name !== glossaryShortcode.name,
    ),
  ].map(({ definition, pluginId }) => ({
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
      example_body: definition.id === glossaryShortcode.id ? "日记归档" : "",
    },
    compiled: definition,
    versions: [],
  }));
export const builtinShortcodes = (): readonly PublicShortcode[] => [
  glossaryShortcode,
  ...pluginRegistry.shortcodes
    .map((item) => item.definition)
    .filter(
      (item) => !regionKind(item.name) && item.name !== glossaryShortcode.name,
    ),
];

export function shortcodeDefinitions(applied: readonly PublicShortcode[] = []) {
  const names = new Set<string>();
  const templates = applied.filter(
    (item) =>
      item.name !== glossaryShortcode.name && item.id !== glossaryShortcode.id,
  );
  const reservedNames = new Set(templates.map((item) => item.name));
  const reservedIds = new Set(templates.map((item) => item.id));
  return [
    ...templates,
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

export function shortcodeSyntax(definitions: readonly PublicShortcode[]) {
  return [
    ...definitions.filter((item) => !regionKind(item.name)),
    ...[...regionNames, glossaryPopupName].map((name) => ({
      name,
      kind: "container" as const,
    })),
  ];
}

export function isCompleteShortcodeCall(
  source: string,
  definition: PublicShortcode,
  applied: readonly PublicShortcode[],
  markdown: boolean,
  maxDepth?: number,
) {
  const call = source.trim();
  const { nodes } = parseShortcodes(
    call,
    shortcodeSyntax(shortcodeDefinitions(applied)),
    markdown,
    maxDepth,
  );
  const root = nodes[0];
  return (
    nodes.length === 1 &&
    root.name === definition.name &&
    root.from === 0 &&
    root.to === call.length
  );
}

/** A private preview may replace an applied name before a new definition has its final ID. */
export function previewShortcodeDefinitions(
  definition: PublicShortcode,
  applied: readonly PublicShortcode[] = [],
) {
  if (definition.id === glossaryShortcode.id) return applied;
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
