import type { PluginPackage } from "./types";
import { createFontRegistry } from "@/core/fonts/registry";
import type { FontDefinition } from "@/core/fonts/types";
import { defineBuilderComponent } from "@/core/builder/registry";

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
    (item.surface !== undefined && item.surface !== "admin") ||
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
      !/\.(?:mjs|css|png|webp|svg|woff2?|ttf|otf|jpg|jpeg|gif|webm|mp4)$/.test(
        name,
      ) ||
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
  const fonts = createFontRegistry(item.fonts ?? [], false).all;
  if (fonts.some((font) => !font.id.startsWith(item.id + ".")))
    throw new Error("Invalid plugin font namespace");
  for (const definition of item.builderComponents ?? []) {
    if (!defineBuilderComponent(definition).type.startsWith(item.id + "."))
      throw new Error("Invalid builder component namespace");
  }
  // Preserve the original object: normalizing before digest verification would reject old packages.
  return item;
}

export function packageFontsMatch(
  declarations: readonly FontDefinition[],
  manifest: PluginPackage,
): boolean {
  const published = createFontRegistry(manifest.fonts ?? [], false).all;
  if (declarations.length !== published.length) return false;
  let linked = true;
  const expected = declarations.map((font, index) => ({
    ...font,
    faces: (font.faces ?? []).map((face, faceIndex) => {
      if (!face.src.startsWith("asset:")) return face;
      const src = published[index]?.faces?.[faceIndex]?.src ?? "";
      const prefix = `/__plugins/assets/${encodeURIComponent(manifest.directory)}/`,
        file = src.slice(prefix.length);
      const valid =
        src.startsWith(prefix) &&
        validAssetName(file) &&
        Object.hasOwn(manifest.assets, file);
      if (!valid) linked = false;
      return valid ? { ...face, src } : face;
    }),
  }));
  return (
    linked &&
    JSON.stringify(createFontRegistry(expected, false).all) ===
      JSON.stringify(published)
  );
}
