import { readManagedPage } from "@/core/contracts/pages";
import { createPluginDataSource } from "./source";

/** Management configuration is session-only; no public store or synthetic callback is involved. */
export function pageConfigurationSource(baseUrl: string) {
  return createPluginDataSource({
    id: "core.pages.settings",
    scope: "session",
    async refresh({ pageId }: { pageId: string }, signal?: AbortSignal) {
      const { data } = await readManagedPage(baseUrl, pageId, { signal });
      return {
        resource_id: "core.pages.settings",
        scope: "session" as const,
        source_epoch: null,
        revision: data.revision,
        updated_at: data.updated_at,
        data: data.value.options ?? {},
      };
    },
  });
}
