import type {
  DraftListItem,
  DraftVersion,
} from "@/core/contracts/content-admin";
export type BatchTarget = DraftVersion & { title: string; language: string };
export function batchTargets(
  rows: DraftListItem[],
  scope: string,
  trash: boolean,
): BatchTarget[] {
  const result = new Map<string, BatchTarget>();
  for (const row of rows) {
    const members =
      scope === "original"
        ? [row]
        : row.translations?.length
          ? row.translations
          : [row];
    for (const item of members) {
      if ((item.status === "trash") !== trash) continue;
      if (scope !== "original" && scope !== "all" && item.language !== scope)
        continue;
      result.set(item.id, {
        id: item.id,
        expected_revision: item.revision,
        expected_seq: item.collaboration_seq,
        title: item.title || row.title,
        language: item.language ?? row.language ?? "",
      });
    }
  }
  return [...result.values()];
}
