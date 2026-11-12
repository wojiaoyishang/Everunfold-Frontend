import "server-only";
import { readRuntimeCatalog } from "@/server/plugins/current";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { readAppliedSettings } from "@/server/settings/current";
import { readConfiguration } from "@/core/config/server";
import type { PublicSnapshot } from "./types";
import { parsePublicSnapshot } from "./validation";
import { FileContentStore } from "@/server/content/store";
import { SITEMAP_PREVIEW_PATH, sitemapEnabled } from "@/core/seo/sitemap-paths";

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
    const catalog = await readRuntimeCatalog();
    const disabledPages = new Set(
      catalog.plugins
        .filter((plugin) => catalog.disabled.includes(plugin.id))
        .flatMap((plugin) => plugin.pages.map((page) => page.registration.id)),
    );
    const configuration = readConfiguration();
    const received = await new FileContentStore(
      configuration.cache.directory,
      configuration.frontendNodeId,
      configuration.settings.sourceEpoch ?? "",
      configuration.cache.maxSnapshotBytes,
    ).read();
    const filename = path.join(configuration.cache.directory, "current.json");
    const file = received ? null : await fs.open(filename, "r");
    try {
      const stat = await file?.stat();
      if (stat && stat.size > configuration.cache.maxSnapshotBytes)
        throw new SnapshotUnavailable();
      const snapshot =
        received ??
        parsePublicSnapshot(
          JSON.parse(await file!.readFile({ encoding: "utf8" })),
        );
      const applied = await readAppliedSettings();
      const value = applied.publicSettings;
      return {
        ...snapshot,
        pages: snapshot.pages?.filter(
          (page) =>
            !page.implementation_id ||
            !disabledPages.has(page.implementation_id),
        ),
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
          ...(configuration.publicSiteUrl &&
          sitemapEnabled({ settings: value ?? snapshot.site.settings })
            ? { sitemapPreviewPath: SITEMAP_PREVIEW_PATH }
            : {}),
        },
      };
    } finally {
      await file?.close();
    }
  } catch {
    throw new SnapshotUnavailable();
  }
});
