import "server-only";

import { readRuntimeCatalog } from "./current";
import { pageInjectionPluginId } from "@/core/page-injections/matching";

export async function pageInjectionPluginAvailable() {
  const catalog = await readRuntimeCatalog("admin").catch(() => null);
  return Boolean(
    catalog?.plugins.some(({ id }) => id === pageInjectionPluginId) &&
    !catalog.disabled.includes(pageInjectionPluginId),
  );
}
