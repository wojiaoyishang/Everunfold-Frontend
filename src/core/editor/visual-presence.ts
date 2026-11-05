import * as Y from "yjs";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { SharedSource } from "@/core/collaboration/editor-binding";
import type { SourceRange } from "./source-positions";

export type SourceMapper = (
  doc: Node,
  source: string,
  range: SourceRange,
  reverse?: boolean,
) => SourceRange | undefined;

export function visualPresence(
  read: () => { shared?: SharedSource; source: string; map: SourceMapper },
) {
  return new Plugin({
    key: new PluginKey("everunfoldPresence"),
    props: {
      decorations(state) {
        const { shared, source, map } = read();
        const doc = shared?.text.doc;
        if (!shared || !doc || shared.host.state.mode !== "shared")
          return DecorationSet.empty;
        const marks = [];
        for (const [id, presence] of shared.awareness.getStates()) {
          if (
            id === doc.clientID ||
            presence.blockId !== shared.blockId ||
            !presence.cursor
          )
            continue;
          const anchor = Y.createAbsolutePositionFromRelativePosition(
              presence.cursor.anchor,
              doc,
            ),
            head = Y.createAbsolutePositionFromRelativePosition(
              presence.cursor.head,
              doc,
            );
          if (
            !anchor ||
            !head ||
            anchor.type !== shared.text ||
            head.type !== shared.text
          )
            continue;
          const range = map(
            state.doc,
            source,
            {
              start: Math.min(anchor.index, head.index),
              end: Math.max(anchor.index, head.index),
            },
            true,
          );
          if (!range) continue;
          const start = Math.min(range.start, state.doc.content.size),
            end = Math.min(range.end, state.doc.content.size);
          const color = presence.user?.color ?? "#4869b0";
          if (start < end)
            marks.push(
              Decoration.inline(start, end, {
                "data-collab-selection": "",
                style: `background-color:${color}28`,
              }),
            );
          marks.push(
            Decoration.widget(
              anchor.index > head.index ? start : end,
              () => {
                const caret = document.createElement("span");
                caret.dataset.collabCaret = presence.user?.name ?? "编辑者";
                caret.style.setProperty("--collab-color", color);
                caret.setAttribute("aria-hidden", "true");
                return caret;
              },
              { key: `caret:${id}:${color}`, side: 1 },
            ),
          );
        }
        return DecorationSet.create(state.doc, marks);
      },
    },
  });
}
