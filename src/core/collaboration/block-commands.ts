import * as Y from "yjs";
import type { DraftFields } from "@/generated/content-admin-contract";
import { commandBody, type BlockCommand } from "@/core/editor/block-commands";
import { LOCAL, projectDocument, makeBlock } from "./document";

/** A single structural transaction leaves every existing Y.Text and editor binding intact. */
export function commandDocument(
  doc: Y.Doc,
  fields: DraftFields,
  command: BlockCommand,
) {
  const body = projectDocument(doc, fields).body;
  if (!commandBody(body, command)) return false;
  const blocks = doc.getMap<Y.Map<unknown>>("blocks");
  if (command.kind === "insert" && blocks.has(command.block.id)) return false;
  doc.transact(() => {
    const order = doc.getArray<string>("order");
    const id = command.kind === "insert" ? command.block.id : command.id;
    if (command.kind === "insert") {
      blocks.set(id, makeBlock(command.block));
    } else {
      for (let i = order.length - 1; i >= 0; i--)
        if (order.get(i) === id) order.delete(i, 1);
    }
    const index =
      command.before === null
        ? order.length
        : order.toArray().indexOf(command.before);
    order.insert(index, [id]);
  }, LOCAL);
  return true;
}
