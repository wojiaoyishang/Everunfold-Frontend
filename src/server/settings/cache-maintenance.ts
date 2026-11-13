import type {
  CacheDiskResource,
  CachePruneReceipt,
  CacheReceiverStatus,
  CacheReceiverTarget,
} from "@/core/contracts/settings";
import { freeDiskBytes, type RevisionUsage } from "../storage/revisions";
import type { FileContentStore } from "../content/store";
import type { FileSettingsStore } from "./store";
import { readReplicas } from "./receiver";

export function cacheMaintenance(
  target: CacheReceiverTarget,
  settings: FileSettingsStore,
  content: FileContentStore,
) {
  async function resource(
    name: CacheDiskResource["resource"],
    replica: { status: CacheDiskResource["status"]; revision: number | null },
    read: () => Promise<RevisionUsage>,
  ): Promise<CacheDiskResource> {
    const usage = await read().catch(() => null);
    return {
      resource: name,
      status: usage ? replica.status : "unavailable",
      revision: usage ? replica.revision : null,
      files: usage?.files ?? null,
      bytes: usage?.bytes ?? null,
      reclaimable_bytes: usage?.reclaimable_bytes ?? null,
    };
  }
  return {
    async status(): Promise<CacheReceiverStatus> {
      const replicas = await readReplicas(settings, content);
      const resources = await Promise.all([
        resource("public-content", replicas.public_content, () =>
          content.usage(replicas.public_content.revision),
        ),
        resource("public-settings", replicas.public_settings, () =>
          settings.usage("public-settings", replicas.public_settings.revision),
        ),
        resource("cache-policy", replicas.cache_policy, () =>
          settings.usage("cache-policy", replicas.cache_policy.revision),
        ),
      ]);
      return {
        protocol: "cache-status-1",
        ...target,
        resources,
        free_bytes: await freeDiskBytes(content.directory),
      };
    },
    async prune(): Promise<CachePruneReceipt> {
      const counts = await Promise.all([
        content.prune(),
        settings.prune("public-settings"),
        settings.prune("cache-policy"),
      ]);
      return {
        protocol: "cache-prune-1",
        ...target,
        removed_files: counts.reduce(
          (total, count) => total + count.removed_files,
          0,
        ),
        removed_bytes: counts.reduce(
          (total, count) => total + count.removed_bytes,
          0,
        ),
      };
    },
  };
}
