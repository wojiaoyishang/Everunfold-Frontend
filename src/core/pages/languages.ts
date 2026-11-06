import type { PublicSnapshot, Content } from "@/core/content/types";
import type { PublicManagedPage } from "@/generated/pages-contract";

/** Only published authored siblings participate; registered components own their language behavior. */
export function pageLanguages(
  snapshot: Pick<PublicSnapshot, "pages">,
  page: PublicManagedPage,
): NonNullable<Content["translations"]> {
  if (page.source !== "custom" || !page.language) return [];
  return (snapshot.pages ?? [])
    .filter(
      (item) =>
        item.source === "custom" &&
        item.language &&
        (page.translation_group_id
          ? item.translation_group_id === page.translation_group_id
          : item.id === page.id),
    )
    .map((item) => ({
      id: item.id,
      language: item.language!,
      path: item.path,
      access: "public",
      is_original: item.is_original ?? item.id === page.id,
    }));
}
