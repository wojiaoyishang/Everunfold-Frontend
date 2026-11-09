import type {
  DraftListItem,
  MetadataPatch,
} from "@/core/contracts/content-admin";
export function metadataValues(item: DraftListItem) {
  return {
    title: item.title,
    excerpt: item.excerpt ?? "",
    categories: item.categories ?? [],
    tags: item.tags ?? [],
    pinned: item.pinned ?? false,
    comments_open: item.comments_open ?? true,
  };
}
export type MetadataValues = ReturnType<typeof metadataValues>;
export function metadataPatch(
  before: MetadataValues,
  after: MetadataValues,
): MetadataPatch {
  const patch: MetadataPatch = {};
  for (const key of ["title", "excerpt", "pinned", "comments_open"] as const)
    if (before[key] !== after[key]) Object.assign(patch, { [key]: after[key] });
  for (const key of ["categories", "tags"] as const)
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      patch[key] = { mode: "replace", values: after[key] };
  return patch;
}
