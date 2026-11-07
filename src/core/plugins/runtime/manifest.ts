import type { PluginPackage } from "./types";

export const validAssetName = (name: string) =>
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$/.test(name) && !name.includes("..");
export function parsePluginPackage(
  value: unknown,
  directory: string,
): PluginPackage {
  const item = value as PluginPackage;
  if (
    !item ||
    item.protocol !== "plugin-package-1" ||
    item.sdk !== 1 ||
    item.directory !== directory ||
    !/^[a-z][a-z0-9-]*$/.test(directory) ||
    !/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(item.id) ||
    !/^[0-9a-f]{64}$/.test(item.build) ||
    !item.title ||
    typeof item.description !== "string" ||
    !Array.isArray(item.pages) ||
    !Array.isArray(item.shortcodes) ||
    !Array.isArray(item.components) ||
    !item.assets ||
    !item.entries
  )
    throw new Error("Invalid or incompatible plugin package");
  if (
    !/^[a-z0-9.-]+\.cjs$/.test(item.entries.node) ||
    !validAssetName(item.entries.node)
  )
    throw new Error("Invalid Node plugin entry");
  for (const entry of [
    item.entries.shared,
    item.entries.browser,
    item.entries.css,
  ].filter((name): name is string => Boolean(name))) {
    if (!validAssetName(entry) || !Object.hasOwn(item.assets, entry))
      throw new Error("Missing public plugin entry");
  }
  for (const [name, asset] of Object.entries(item.assets)) {
    if (
      !validAssetName(name) ||
      !/\.(?:mjs|css|png|webp|svg|woff2|jpg|jpeg|gif|webm|mp4)$/.test(name) ||
      !/^[0-9a-f]{64}$/.test(asset.sha256) ||
      !Number.isSafeInteger(asset.bytes) ||
      asset.bytes < 0 ||
      asset.bytes > 16 * 1024 * 1024
    )
      throw new Error("Invalid public plugin resource");
  }
  if (
    !item.entries.shared.endsWith(".mjs") ||
    (item.entries.browser && !item.entries.browser.endsWith(".mjs")) ||
    (item.entries.css && !item.entries.css.endsWith(".css"))
  )
    throw new Error("Plugin entry type mismatch");
  return item;
}
