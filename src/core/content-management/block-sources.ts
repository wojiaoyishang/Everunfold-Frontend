import type { DraftFields } from "@/generated/content-admin-contract";
import type { BlockSourcePatch } from "@/generated/collaboration-contract";
import { sha256Hex } from "@/core/browser/crypto";

type Block = DraftFields["body"][number];
type BufferedSource = {
  type: BlockSourcePatch["type"];
  base: string;
  content: string;
  locallyRemoved?: boolean;
};
export type BufferedSources = Record<string, BufferedSource>;

export function readBlockSources(key: string): BufferedSources {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? "{}");
    if (saved && typeof saved === "object") {
      return Object.fromEntries(
        Object.entries(saved).filter(
          ([id, entry]) =>
            /^[0-9a-f-]{36}$/i.test(id) &&
            entry &&
            (entry.type === "html" || entry.type === "markdown") &&
            typeof entry.base === "string" &&
            typeof entry.content === "string",
        ),
      );
    }
  } catch {
    // Private mode or a damaged tab-local copy. The in-memory editor still works.
  }
  return {};
}

export function bufferBlockSource(
  sources: BufferedSources,
  block: Block,
  content: string,
  displayed: string,
) {
  const next = { ...sources };
  const previous = next[block.id];
  if (content === block.content) delete next[block.id];
  else
    next[block.id] = {
      type: previous?.type ?? block.type ?? "markdown",
      base: previous?.base ?? displayed,
      content,
    };
  return next;
}

export function withBlockSources(
  fields: DraftFields,
  sources: BufferedSources,
): DraftFields {
  return {
    ...fields,
    body: fields.body.map((block) =>
      sources[block.id]
        ? { ...block, content: sources[block.id].content }
        : block,
    ),
  };
}

export async function blockSourcePatches(
  sources: BufferedSources,
): Promise<BlockSourcePatch[]> {
  return Promise.all(
    Object.entries(sources).map(async ([id, { type, base, content }]) => {
      return {
        id,
        type,
        base_hash: await sha256Hex(base),
        content,
      };
    }),
  );
}
