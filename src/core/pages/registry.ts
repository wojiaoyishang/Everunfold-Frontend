import type { PageManifest, PublicManagedPage } from "@/core/contracts/pages";
import { pluginRegistry } from "@/core/plugins/registry";
import { collectCustomPages } from "./registration";

/** Component identities are deployed code; database data cannot import a module or URL. */
const registered = () => collectCustomPages(pluginRegistry.pages);
export const pageManifest: PageManifest = {
  protocol: "pages-1",
  get pages() {
    return registered().manifest.pages;
  },
};
/** A trusted implementation explicitly opts into shared options with locale-aware program UI. */
export const localizedPageImplementations = {
  has(id: string) {
    return registered().localized.has(id);
  },
};
export function hasPageImplementation(
  page: Pick<
    PublicManagedPage,
    "source" | "implementation_id" | "implementation_version"
  >,
): boolean {
  return (
    page.source === "custom" ||
    pageManifest.pages.some(
      (item) =>
        item.id === page.implementation_id &&
        item.version === page.implementation_version,
    )
  );
}
