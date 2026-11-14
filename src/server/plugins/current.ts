import "server-only";
import path from "node:path";
import { cache } from "react";
import {
  readConfiguration,
  readPageConfiguration,
  projectRoot,
} from "@/core/config/server";
import { readAppliedSettings } from "@/server/settings/current";
import { installRuntimePlugins } from "@/core/plugins/runtime/store";
import {
  pluginAssetCache,
  readInstalledPlugins,
  publicPackage,
  sha256,
} from "./packages";
import { themeRegistry } from "@/core/extensions/themes";
import type { RuntimeCatalog } from "@/core/plugins/runtime/types";
import { scopePluginCatalog } from "@/core/plugins/runtime/catalog-scope";

export const readRuntimeCatalog = cache(
  async (surface?: "admin"): Promise<RuntimeCatalog> => {
    const root = projectRoot(),
      config = readPageConfiguration();
    const [installed, applied] = await Promise.all([
      readInstalledPlugins(
        config.plugins.directory,
        path.join(root, "var/cache/plugin-packages"),
      ),
      readAppliedSettings(),
    ]);
    const buildErrors = [...installed.errors];
    if (process.env.NODE_ENV !== "production") {
      const { readFile } = await import("node:fs/promises");
      try {
        const raw = await readFile(
          path.join(config.plugins.directory, ".errors.json"),
          "utf8",
        );
        if (raw.length <= 512 * 1024) buildErrors.push(...JSON.parse(raw));
      } catch {
        /* A build has not reported errors. */
      }
    }
    const preferences = applied.publicSettings?.extensions;
    const disabled = preferences?.disabled_plugins ?? [];
    const theme = preferences?.theme || config.theme.active;
    themeRegistry.chain(theme);
    const {
      packages,
      disabled: disabledForSurface,
      errors,
    } = scopePluginCatalog(
      { ...installed, errors: buildErrors },
      disabled,
      surface,
    );
    const plugins = packages.map((item) => publicPackage(item.manifest));
    const revision = sha256(
      JSON.stringify({
        builds: plugins.map((item) => item.build),
        disabled: disabledForSurface,
        theme,
        errors,
      }),
    );
    if (!surface)
      installRuntimePlugins(
        packages.map((item) => item.plugin),
        disabledForSurface,
        revision,
      );
    return {
      protocol: "plugin-catalog-1",
      revision,
      theme,
      disabled: disabledForSurface,
      plugins,
      errors,
      development: process.env.NODE_ENV !== "production",
    };
  },
);

export async function readPluginAsset(
  directory: string,
  filename: string,
  surface?: "admin",
) {
  const config = readConfiguration();
  const installed = await readInstalledPlugins(
    config.plugins.directory,
    path.join(projectRoot(), "var/cache/plugin-packages"),
  );
  const accepted = installed.packages.find(
    (item) =>
      item.manifest.directory === directory &&
      (item.manifest.surface === surface ||
        (!surface &&
          item.manifest.surface === "admin" &&
          item.manifest.preview ===
            `/__plugins/assets/${directory}/${filename}`)),
  );
  if (!accepted) return null;
  const asset = accepted.files.get(filename);
  if (asset) return asset;
  // Old content-addressed resources remain usable by already-open editor sessions.
  const { readFile, lstat } = await import("node:fs/promises");
  const file = pluginAssetCache(
    path.join(projectRoot(), "var/cache/plugin-packages"),
    accepted.manifest,
    filename,
  );
  const info = await lstat(file).catch(() => null);
  if (
    !info?.isFile() ||
    info.size > 16 * 1024 * 1024 ||
    !/^[a-z]+\.[0-9a-f]{64}\.(?:mjs|css|png|webp|svg|woff2?|ttf|otf|jpg|jpeg|gif|webm|mp4)$/.test(
      filename,
    )
  )
    return null;
  const bytes = await readFile(file);
  if (!filename.includes(sha256(bytes))) return null;
  return bytes;
}
