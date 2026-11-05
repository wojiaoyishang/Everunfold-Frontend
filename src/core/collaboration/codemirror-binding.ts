import * as Y from "yjs";
import { Annotation, Transaction, type ChangeSpec } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import type { SharedSource } from "./editor-binding";
import {
  applySourceChanges,
  normalizeSourceLines,
  normalizedSourceOffset,
  rawSourceOffset,
  sourceSplice,
} from "@/core/editor/source-lines";

const remoteSource = Annotation.define<boolean>();
class Caret extends WidgetType {
  constructor(
    readonly name: string,
    readonly color: string,
  ) {
    super();
  }
  eq(other: Caret) {
    return this.name === other.name && this.color === other.color;
  }
  toDOM() {
    const caret = document.createElement("span");
    caret.dataset.collabCaret = this.name;
    caret.style.setProperty("--collab-color", this.color);
    caret.setAttribute("aria-hidden", "true");
    return caret;
  }
}

/** Raw CRLF and relative Y.Text positions are translated at the editor boundary. */
export class CollaborativeSourceBinding {
  decorations: DecorationSet = Decoration.none;
  private origin = {};
  constructor(
    readonly view: EditorView,
    readonly shared: SharedSource,
    readonly raw: { current: string },
  ) {
    shared.undo.addTrackedOrigin(this.origin);
    shared.text.observe(this.observe);
    shared.awareness.on("change", this.presence);
    raw.current = shared.text.toString();
    this.decorate();
  }
  observe = (event: Y.YTextEvent, transaction: Y.Transaction) => {
    const { shared, raw } = this;
    if (transaction.origin === this.origin) return;
    const before = raw.current,
      after = shared.text.toString();
    raw.current = after;
    const changes: ChangeSpec[] = [];
    let at = 0;
    for (const part of event.delta) {
      if (part.retain) at += part.retain;
      if (part.delete) {
        changes.push({
          from: normalizedSourceOffset(before, at),
          to: normalizedSourceOffset(before, at + part.delete),
          insert: "",
        });
        at += part.delete;
      }
      if (typeof part.insert === "string")
        changes.push({
          from: normalizedSourceOffset(before, at),
          insert: normalizeSourceLines(part.insert),
        });
    }
    const current = this.view.state.doc.toString(),
      next = normalizeSourceLines(after);
    if (current === next) return;
    let change;
    try {
      const candidate = this.view.state.changes(changes);
      change =
        candidate.apply(this.view.state.doc).toString() === next
          ? candidate
          : sourceSplice(current, next);
    } catch {
      change = sourceSplice(current, next);
    }
    this.view.dispatch({
      changes: change,
      annotations: [remoteSource.of(true), Transaction.addToHistory.of(false)],
    });
  };
  presence = (changes: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const { shared } = this;
    if (
      [...changes.added, ...changes.updated, ...changes.removed].every(
        (id) => id === shared.text.doc?.clientID,
      )
    )
      return;
    this.view.dispatch({ annotations: remoteSource.of(true) });
  };
  update(update: ViewUpdate) {
    const { shared, raw } = this;
    if (
      update.docChanged &&
      !update.transactions.some((tr) => tr.annotation(remoteSource))
    ) {
      const before = raw.current;
      const changes: { from: number; to: number; insert: string }[] = [];
      const newline = /\r\n|\r|\n/.exec(before)?.[0] ?? "\n";
      update.changes.iterChanges((from, to, _, __, insert) =>
        changes.push({
          from: rawSourceOffset(before, from),
          to: rawSourceOffset(before, to),
          insert: insert.sliceString(0, insert.length, newline),
        }),
      );
      raw.current = applySourceChanges(before, update.changes);
      shared.text.doc?.transact(() => {
        for (const change of changes.reverse()) {
          shared.text.delete(change.from, change.to - change.from);
          shared.text.insert(change.from, change.insert);
        }
      }, this.origin);
    }
    if (
      update.view.hasFocus &&
      (update.selectionSet || update.docChanged || update.focusChanged)
    ) {
      const { anchor, head } = update.state.selection.main;
      shared.host.setPresence(shared.blockId, {
        start: rawSourceOffset(raw.current, anchor),
        end: rawSourceOffset(raw.current, head),
      });
    }
    this.decorate();
  }
  private decorate() {
    const { shared, raw } = this;
    const decorations = [];
    const text = shared.text,
      doc = text.doc;
    if (!doc) return;
    for (const [id, state] of shared.awareness.getStates()) {
      if (
        id === doc.clientID ||
        !state.cursor ||
        state.blockId !== shared.blockId
      )
        continue;
      const anchor = Y.createAbsolutePositionFromRelativePosition(
          state.cursor.anchor,
          doc,
        ),
        head = Y.createAbsolutePositionFromRelativePosition(
          state.cursor.head,
          doc,
        );
      if (!anchor || !head || anchor.type !== text || head.type !== text)
        continue;
      const from = normalizedSourceOffset(
          raw.current,
          Math.min(anchor.index, head.index),
        ),
        to = normalizedSourceOffset(
          raw.current,
          Math.max(anchor.index, head.index),
        );
      const color = /^#[0-9a-f]{6}$/i.test(String(state.user?.color))
        ? state.user.color
        : "#4869b0";
      if (from < to && to <= this.view.state.doc.length)
        decorations.push(
          Decoration.mark({
            attributes: {
              "data-collab-selection": "",
              style: `background-color:${color}28`,
            },
          }).range(from, to),
        );
      decorations.push(
        Decoration.widget({
          widget: new Caret(state.user?.name ?? "编辑者", color),
          side: 1,
        }).range(
          Math.min(
            normalizedSourceOffset(raw.current, head.index),
            this.view.state.doc.length,
          ),
        ),
      );
    }
    this.decorations = Decoration.set(decorations, true);
  }
  destroy() {
    const { shared } = this;
    shared.text.unobserve(this.observe);
    shared.awareness.off("change", this.presence);
    shared.undo.removeTrackedOrigin(this.origin);
  }
}

export function collaborativeSource(
  shared: SharedSource,
  raw: { current: string },
) {
  return ViewPlugin.define(
    (view) => new CollaborativeSourceBinding(view, shared, raw),
    { decorations: (value) => value.decorations },
  );
}
