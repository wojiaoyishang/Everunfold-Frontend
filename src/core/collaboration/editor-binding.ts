import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import type { DraftSession } from "./session";

export interface SharedSource {
  text: Y.Text;
  awareness: Awareness;
  undo: Y.UndoManager;
  blockId: string;
  host: DraftSession;
}
