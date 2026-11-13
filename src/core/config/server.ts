import "server-only";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cache } from "react";

import { ConfigurationError } from "./schema";
import { contentDirectory, readConfigurationFiles } from "./files";

export function projectRoot(): string {
  const candidates = [
    process.env.EVERUNFOLD_PROJECT_ROOT,
    process.cwd(),
    path.dirname(fileURLToPath(import.meta.url)),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    // Runtime configuration is mounted separately; it must not be traced into build output.
    let current = path.resolve(/* turbopackIgnore: true */ candidate);
    for (let level = 0; level < 12; level += 1) {
      try {
        const metadata = JSON.parse(
          fs.readFileSync(path.join(current, "package.json"), "utf8"),
        ) as { name?: string };
        if (metadata.name === "everunfold-frontend") return current;
      } catch {
        /* A candidate ancestor may not be the project root. */
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  throw new ConfigurationError("无法定位前端项目配置根目录");
}

export function readConfiguration() {
  const root = projectRoot();
  const { settings, connections } = readConfigurationFiles(root);
  return {
    ...settings,
    connections,
    plugins: { directory: path.resolve(root, settings.plugins.directory) },
    settings: {
      ...settings.settings,
      directory: path.resolve(root, settings.settings.directory),
    },
    cache: {
      ...settings.cache,
      directory: path.resolve(root, contentDirectory(settings, !!connections)),
    },
  };
}

export const readPageConfiguration = cache(readConfiguration);
