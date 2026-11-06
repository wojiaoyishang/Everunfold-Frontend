import type {
  ConflictResolution,
  MergeDetail,
} from "@/core/contracts/collaboration";
import type { DraftFields } from "@/core/contracts/content-admin";

/** A delayed lease response cannot replace newer conflict decisions or a completed result. */
export function renewedMerge(current: MergeDetail | null, lease: MergeDetail) {
  return current?.id === lease.id && current.status === "active"
    ? { ...current, expires_at: lease.expires_at }
    : current;
}

export function sameMergeTarget(previous: MergeDetail, next: MergeDetail) {
  return (
    previous.epoch === next.epoch &&
    previous.target_seq === next.target_seq &&
    JSON.stringify(previous.remote) === JSON.stringify(next.remote)
  );
}

function valueAt(fields: DraftFields, path: string[]): unknown {
  if (path[0] === "order") return fields.body.map((block) => block.id);
  if (path[0] === "body" && path.length > 1) {
    const block = fields.body.find((part) => part.id === path[1]);
    return path.length === 2
      ? (block ?? null)
      : (block?.[path[2] as keyof typeof block] ?? null);
  }
  if (path[0] === "settings" && path.length === 2)
    return (
      fields.settings?.[
        path[1] as keyof NonNullable<DraftFields["settings"]>
      ] ?? null
    );
  return fields[path[0] as keyof DraftFields] ?? null;
}

/** Restore explicit decisions only. Unresolved conflicts keep requiring review. */
export function resumedDecisions(
  previous: MergeDetail,
  next: MergeDetail,
  result: DraftFields,
): ConflictResolution[] {
  return next.conflicts
    .filter((conflict) => previous.resolved.includes(conflict.key))
    .map((conflict) => ({
      key: conflict.key,
      choice: "custom",
      value: valueAt(result, conflict.path) as ConflictResolution["value"],
    }));
}
