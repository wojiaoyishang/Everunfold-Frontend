import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { getSearchQuery } from "@codemirror/search";

/** The theme owns the search controls, so highlights cannot depend on CM's native panel. */
export const sourceSearchHighlights = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        getSearchQuery(update.startState) !== getSearchQuery(update.state)
      )
        this.decorations = this.build(update.view);
    }
    build(view: EditorView) {
      const query = getSearchQuery(view.state);
      if (!query.valid) return Decoration.none;
      const marks = [];
      const selected = view.state.selection.main;
      for (const { from, to } of view.visibleRanges) {
        const cursor = query.getCursor(view.state, from, to);
        for (
          let step = cursor.next();
          !step.done && marks.length < 2000;
          step = cursor.next()
        ) {
          const match = step.value;
          if (match.from < match.to)
            marks.push(
              Decoration.mark({
                class:
                  match.from === selected.from && match.to === selected.to
                    ? "cm-searchMatch cm-searchMatch-selected"
                    : "cm-searchMatch",
              }).range(match.from, match.to),
            );
        }
      }
      return Decoration.set(marks, true);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
