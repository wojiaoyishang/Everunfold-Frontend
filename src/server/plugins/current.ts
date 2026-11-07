import "server-only";
import path from "node:path";
import { cache } from "react";
import { readConfiguration, projectRoot } from "@/core/config/server";
import { readAppliedSettings } from "@/server/settings/current";
import { installRuntimePlugins } from "@/core/plugins/runtime/store";
import { readInstalledPlugins, publicPackage, sha256 } from "./packages";
import { themeRegistry } from "@/core/extensions/themes";
import type { RuntimeCatalog } from "@/core/plugins/runtime/types";

export const readRuntimeCatalog = cache(async (): Promise<RuntimeCatalog> => {
  const root = projectRoot(),
    config = readConfiguration();
  const [installed, applied] = await Promise.all([
    readInstalledPlugins(
      config.plugins.directory,
      path.join(root, "var/cache/plugin-packages"),
    ),
    readAppliedSettings(),
  ]);
  if (process.env.NODE_ENV !== "production") {
    const { readFile } = await import("node:fs/promises");
    try {
      const raw = await readFile(
        path.join(config.plugins.directory, ".errors.json"),
        "utf8",
      );
      if (raw.length <= 512 * 1024) installed.errors.push(...JSON.parse(raw));
    } catch {
      /* A build has not reported errors. */
    }
  }
  const preferences = applied.publicSettings?.extensions;
  const disabled = preferences?.disabled_plugins ?? [];
  const theme = preferences?.theme || config.theme.active;
  themeRegistry.chain(theme);
  const plugins = installed.packages.map((item) =>
    publicPackage(item.manifest),
  );
  const revision = sha256(
    JSON.stringify({
      builds: plugins.map((item) => item.build),
      disabled,
      theme,
      errors: installed.errors,
    }),
  );
  installRuntimePlugins(
    installed.packages.map((item) => item.plugin),
    disabled,
    revision,
  );
  return {
    protocol: "plugin-catalog-1",
    revision,
    theme,
    disabled,
    plugins,
    errors: installed.errors,
    development: process.env.NODE_ENV !== "production",
  };
});

export async function readPluginAsset(directory: string, filename: string) {
  const config = readConfiguration();
  const installed = await readInstalledPlugins(
    config.plugins.directory,
    path.join(projectRoot(), "var/cache/plugin-packages"),
  );
  const accepted = installed.packages.find(
    (item) => item.manifest.directory === directory,
  );
  if (!accepted) return null;
  const asset = accepted.files.get(filename);
  if (asset) return asset;
  // Old content-addressed resources remain usable by already-open editor sessions.
  const { readFile, lstat } = await import("node:fs/promises");
  const file = path.join(
    projectRoot(),
    "var/cache/plugin-packages",
    directory,
    filename,
  );
  const info = await lstat(file).catch(() => null);
  if (
    !info?.isFile() ||
    info.size > 16 * 1024 * 1024 ||
    !/^[a-z]+\.[0-9a-f]{64}\.(?:mjs|css|png|webp|svg|woff2|jpg|jpeg|gif|webm|mp4)$/.test(
      filename,
    )
  )
    return null;
  const bytes = await readFile(file);
  if (!filename.includes(sha256(bytes))) return null;
  return bytes;
}
