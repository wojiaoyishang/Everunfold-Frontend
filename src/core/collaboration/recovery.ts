import type { DraftBlock, DraftFields } from "@/core/contracts/content-admin";
import { serializeDraftExport } from "./export";

export interface LocalRecovery {
  ownerId: string;
  path: string;
  filename: string;
  content: string;
  title: string;
}
let current: LocalRecovery | null = null;
const listeners = new Set<() => void>();
/** Browser-memory export of an already-authorized page; never an authorization/cache source. */
export function rememberRecovery(
  ownerId: string,
  path: string,
  id: string,
  fields: DraftFields,
  removedBlocks: DraftBlock[] = [],
  unappliedHtml: Record<string, string> = {},
) {
  const content = serializeDraftExport(fields, removedBlocks, unappliedHtml);
  if (
    current?.ownerId === ownerId &&
    current.path === path &&
    current.content === content
  )
    return;
  current = {
    ownerId,
    path,
    filename: `draft-${id}.json`,
    content,
    title: fields.title || "草稿",
  };
  listeners.forEach((listen) => listen());
}
export const recoverySnapshot = () => current;
export function recoveryForPage(
  value: LocalRecovery | null,
  path: string,
  previousOwner: string | undefined,
) {
  return value?.path === path && value.ownerId === previousOwner ? value : null;
}
export const noServerRecovery = () => null;
export function subscribeRecovery(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function clearRecovery() {
  if (!current) return;
  current = null;
  listeners.forEach((listen) => listen());
}
