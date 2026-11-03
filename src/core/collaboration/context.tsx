"use client";
import { createContext, useContext } from "react";
import type { DraftSession } from "./session";
import { blockText } from "./document";
import * as Y from "yjs";
export const DraftCollaborationContext = createContext<DraftSession | null>(
  null,
);
export function useBlockCollaboration(id: string) {
  const session = useContext(DraftCollaborationContext);
  return session?.state.ready
    ? {
        text: blockText(session.doc, id),
        awareness: session.awareness,
        undo: session.undo,
        blockId: id,
        rich: session.doc
          .getMap<Y.Map<unknown>>("blocks")
          .get(id)
          ?.get("rich") as Y.XmlFragment | undefined,
        host: session,
      }
    : undefined;
}
