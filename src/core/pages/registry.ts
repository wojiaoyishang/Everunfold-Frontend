import type {
  PageManifest,
  PublicManagedPage,
} from "@/generated/pages-contract";
import { peopleDefinition } from "./people-definition";

/** Component identities are deployed code; database data cannot import a module or URL. */
export const pageManifest: PageManifest = {
  protocol: "pages-1",
  pages: [peopleDefinition],
};
/** A trusted implementation explicitly opts into shared options with locale-aware program UI. */
export const localizedPageImplementations: ReadonlySet<string> = new Set([
  "core.people",
]);
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
