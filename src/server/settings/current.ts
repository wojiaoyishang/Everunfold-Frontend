import "server-only";
import { cache } from "react";
import { readPageConfiguration } from "../../core/config/server";
import { FileSettingsStore } from "./store";
import type { CachePolicy, PublicSettings } from "@/core/contracts/settings";

/** No backend fetch and no time TTL: read the last complete locally applied revision. */
export const readAppliedSettings = cache(async () => {
  const config = readPageConfiguration();
  const epoch = config.settings.sourceEpoch;
  if (!epoch) return { publicSettings: null, policy: null, revision: 0 };
  const store = new FileSettingsStore(
    config.settings.directory,
    config.frontendNodeId,
    epoch,
  );
  const [publicValue, policyValue] = await Promise.all([
    store.read("public-settings"),
    store.read("cache-policy"),
  ]);
  return {
    publicSettings: (publicValue?.value as PublicSettings | undefined) ?? null,
    policy: (policyValue?.value as CachePolicy | undefined) ?? null,
    revision: publicValue?.revision ?? 0,
  };
});

export async function readAppliedSiteBrand() {
  const applied = await readAppliedSettings().catch(() => null);
  const site = applied?.publicSettings?.site;
  return site && applied
    ? { name: site.name, icon_url: site.icon_url, revision: applied.revision }
    : null;
}
