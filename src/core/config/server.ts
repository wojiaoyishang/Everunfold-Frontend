import "server-only";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

import { ConfigurationError, parseConfiguration } from "./schema";

export function projectRoot(): string {
  const candidates = [
    process.env.EVERUNFOLD_PROJECT_ROOT,
    process.cwd(),
    path.dirname(fileURLToPath(import.meta.url)),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    let current = path.resolve(candidate);
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
  const configuredFile = process.env.CONFIG_FILE ?? "config.toml";
  if (!configuredFile.trim())
    throw new ConfigurationError("CONFIG_FILE 不能为空");
  const filename = path.resolve(root, configuredFile);
  let input: unknown;
  try {
    input = parse(fs.readFileSync(filename, "utf8"));
  } catch {
    throw new ConfigurationError("前端实例配置缺失或 TOML 格式无效");
  }
  const settings = parseConfiguration(input, process.env);
  return {
    ...settings,
    cache: {
      ...settings.cache,
      directory: path.resolve(root, settings.cache.directory),
    },
  };
}
