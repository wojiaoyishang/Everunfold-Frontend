import type { DraftBlock } from "@/core/contracts/content-admin";

export type BlockCommand =
  | { kind: "insert"; block: DraftBlock; before: string | null }
  | { kind: "move"; id: string; before: string | null };

/** Resolve against the latest body, never an index captured at drag start. */
export function commandBody(body: DraftBlock[], command: BlockCommand) {
  if (command.before !== null && !body.some((b) => b.id === command.before))
    return null;
  if (command.kind === "insert") {
    if (body.length >= 128 || body.some((b) => b.id === command.block.id))
      return null;
    const index =
      command.before === null
        ? body.length
        : body.findIndex((b) => b.id === command.before);
    return [...body.slice(0, index), command.block, ...body.slice(index)];
  }
  const source = body.find((b) => b.id === command.id);
  if (!source || command.before === command.id) return null;
  const rest = body.filter((b) => b.id !== command.id);
  const index =
    command.before === null
      ? rest.length
      : rest.findIndex((b) => b.id === command.before);
  const next = [...rest.slice(0, index), source, ...rest.slice(index)];
  return next.every((b, i) => b.id === body[i].id) ? null : next;
}
