"use client";
import { createContext, useContext } from "react";
import type { DraftSession } from "./session";
import { blockText } from "./document";
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
      }
    : undefined;
}
