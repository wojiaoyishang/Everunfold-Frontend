import type { RuntimeCatalog } from "./types";
/** Full and embedded editors share these routes; preview and settings pages can update live. */
export function isPluginEditingRoute(path: string) {
  return /^\/admin\/(?:content\/[^/]+\/(?:new|[^/]+\/(?:edit|live))|pages\/(?:new|[^/]+(?:\/live)?))\/?$/.test(
    path,
  );
}
export function packageSetChanged(
  current: ReadonlyMap<string, { build: string }>,
  catalog: RuntimeCatalog,
) {
  const next = catalog.plugins.filter(
    (plugin) => !catalog.disabled.includes(plugin.id),
  );
  return (
    next.length !== current.size ||
    next.some((plugin) => current.get(plugin.id)?.build !== plugin.build)
  );
}
