import "server-only";
import { readRuntimeCatalog } from "@/server/plugins/current";

import { cache } from "react";
import { readAppliedSettings } from "@/server/settings/current";
import { readPageConfiguration } from "@/core/config/server";
import type { PublicSnapshot } from "./types";
import {
  FileContentStore,
  MissingPublicContent,
  readLegacySnapshot,
} from "@/server/content/store";
import { syncFailure } from "@/server/sync-diagnostics";

export class SnapshotUnavailable extends Error {
  constructor(
    readonly reason: "unsynced" | "unreadable",
    options?: ErrorOptions,
  ) {
    super(
      reason === "unsynced" ? "公开内容尚未同步" : "无法读取公开副本",
      options,
    );
    this.name = "SnapshotUnavailable";
  }
}

const lastReadFailure: Partial<Record<SnapshotUnavailable["reason"], number>> =
  {};

async function readContentReplica(
  configuration: ReturnType<typeof readPageConfiguration>,
) {
  try {
    const received = await new FileContentStore(
      configuration.cache.directory,
      configuration.frontendNodeId,
      configuration.settings.sourceEpoch ?? "",
      configuration.cache.maxSnapshotBytes,
    ).read();
    // Legacy snapshots do not carry a deployment binding for explicit profiles.
    return (
      received ??
      (configuration.connections
        ? null
        : await readLegacySnapshot(
            configuration.cache.directory,
            configuration.cache.maxSnapshotBytes,
          ))
    );
  } catch (error) {
    if (
      error instanceof MissingPublicContent ||
      (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT"
    )
      throw new SnapshotUnavailable("unsynced", { cause: error });
    throw error;
  }
}

export const readPublicSnapshot = cache(async (): Promise<PublicSnapshot> => {
  try {
    const configuration = readPageConfiguration();
    const [catalog, applied, snapshot] = await Promise.all([
      readRuntimeCatalog(),
      readAppliedSettings(),
      readContentReplica(configuration),
    ]);
    if (!snapshot) throw new SnapshotUnavailable("unsynced");
    const disabledPages = new Set(
      catalog.plugins
        .filter((plugin) => catalog.disabled.includes(plugin.id))
        .flatMap((plugin) => plugin.pages.map((page) => page.registration.id)),
    );
    const value = applied.publicSettings;
    return {
      ...snapshot,
      pages: snapshot.pages?.filter(
        (page) =>
          !page.implementation_id || !disabledPages.has(page.implementation_id),
      ),
      glossary: value?.extensions?.disabled_plugins?.includes(
        "everunfold.glossary",
      )
        ? []
        : snapshot.glossary,
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
  } catch (error) {
    const failure =
      error instanceof SnapshotUnavailable
        ? error
        : new SnapshotUnavailable("unreadable", { cause: error });
    // Visitors and readiness probes can reach this path repeatedly while a node starts.
    const now = Date.now();
    const last = lastReadFailure[failure.reason];
    if (last === undefined || now - last >= 60_000) {
      lastReadFailure[failure.reason] = now;
      syncFailure(
        { direction: "local", operation: "read public snapshot", status: 503 },
        failure.reason === "unsynced"
          ? "public_data_not_synced"
          : "replica_unavailable",
        failure.cause,
      );
    }
    throw failure;
  }
});
