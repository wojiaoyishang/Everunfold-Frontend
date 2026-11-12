import type { PublicSnapshot } from "@/core/content/types";
import { snapshotLocale } from "@/core/i18n/snapshot";

export function readingPage(
  snapshot: PublicSnapshot,
  field: "home_page_id" | "posts_page_id",
  locale = snapshotLocale(snapshot),
) {
  const id = snapshot.site.settings?.site.reading?.[field];
  if (!id) return undefined;
  const pages = (snapshot.pages ?? []).filter(
    (page) =>
      page.source === "custom" &&
      page.enabled &&
      (!page.access || page.access === "public"),
  );
  const selected = pages.find((page) => page.id === id);
  if (!selected) return undefined;
  return (
    pages.find(
      (page) =>
        page.translation_group_id &&
        page.translation_group_id === selected.translation_group_id &&
        page.language === locale,
    ) ?? selected
  );
}
