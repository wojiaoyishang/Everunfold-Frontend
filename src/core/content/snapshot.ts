import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { readAppliedSettings } from "@/server/settings/current";
import { readConfiguration } from "@/core/config/server";
import type { PublicSnapshot } from "./types";
import { parsePublicSnapshot } from "./validation";

export class SnapshotUnavailable extends Error {
  constructor() {
    super(
      "公开内容尚未准备好，或快照验证失败。请按项目运行文档生成完整公开快照。",
    );
    this.name = "SnapshotUnavailable";
  }
}

export const readPublicSnapshot = cache(async (): Promise<PublicSnapshot> => {
  try {
    const configuration = readConfiguration();
    const filename = path.join(configuration.cache.directory, "current.json");
    const file = await fs.open(filename, "r");
    try {
      const stat = await file.stat();
      if (stat.size > configuration.cache.maxSnapshotBytes)
        throw new SnapshotUnavailable();
      const snapshot = parsePublicSnapshot(
        JSON.parse(await file.readFile({ encoding: "utf8" })),
      );
      const applied = await readAppliedSettings();
      const value = applied.publicSettings;
      return {
        ...snapshot,
        site: {
          ...snapshot.site,
          ...(value
            ? {
                name: value.site.name,
                description: value.site.description,
                author: value.site.author,
                avatar_url: value.site.avatar_url || null,
                notice: value.site.notice ?? "",
                navigation: (value.site.navigation ?? []).map((item) => ({
                  label: item.label,
                  href: item.href,
                  icon: item.icon ?? "link",
                })),
                hero_title: value.theme.hero_title ?? "",
                hero_subtitle: value.theme.hero_subtitle ?? "",
                hero_url: value.theme.background_url || null,
                settings: value,
                settingsRevision: applied.revision,
              }
            : {}),
          ...(applied.policy ? { cachePolicy: applied.policy } : {}),
        },
      };
    } finally {
      await file.close();
    }
  } catch {
    throw new SnapshotUnavailable();
  }
});
