"use client";
import { useImperativeHandle, type Ref, type RefObject } from "react";
import type { EditorView } from "@codemirror/view";
import { indentMore, indentLess, isolateHistory } from "@codemirror/commands";
import {
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
} from "@codemirror/search";
import { sourceCommand } from "@/core/editor/source-commands";
import * as Y from "yjs";
import type { SourceEditorHandle } from "./code-editor";
/** Imperative commands stay inside the encapsulated source control. */
export function useCodeEditorHandle(
  ref: Ref<SourceEditorHandle> | undefined,
  view: RefObject<EditorView | null>,
  latest: RefObject<{ disabled?: boolean }>,
  text: Y.Text | undefined,
  undo: Y.UndoManager | undefined,
) {
  useImperativeHandle(
    ref,
    () => ({
      focus: () => view.current?.focus(),
      selection: () => {
        const sel = view.current?.state.selection.main;
        return { start: sel?.from ?? 0, end: sel?.to ?? 0 };
      },
      run: (command) => {
        const editor = view.current;
        if (!editor || latest.current.disabled) return;
        undo?.stopCapturing();
        editor.dispatch({
          ...sourceCommand(editor.state, command),
          annotations: isolateHistory.of("full"),
        });
        undo?.stopCapturing();
        editor.focus();
      },
      find: (direction) => {
        if (view.current)
          (direction === 1 ? findNext : findPrevious)(view.current);
      },
      replace: (all = false) => {
        if (!view.current || latest.current.disabled) return;
        undo?.stopCapturing();
        (all ? replaceAll : replaceNext)(view.current);
        undo?.stopCapturing();
      },
      indent: (direction) => {
        if (!view.current || latest.current.disabled) return;
        undo?.stopCapturing();
        (direction === 1 ? indentMore : indentLess)(view.current);
        undo?.stopCapturing();
        view.current.focus();
      },
      insert: (before, after = "") => {
        const editor = view.current;
        if (!editor || latest.current.disabled) return;
        const { from, to } = editor.state.selection.main;
        const selected = editor.state.sliceDoc(from, to);
        undo?.stopCapturing();
        editor.dispatch({
          changes: { from, to, insert: before + selected + after },
          selection: {
            anchor: from + before.length,
            head: from + before.length + selected.length,
          },
          scrollIntoView: true,
          annotations: isolateHistory.of("full"),
        });
        undo?.stopCapturing();
        editor.focus();
      },
      captureInsertion: () => {
        const editor = view.current;
        if (!editor) return () => {};
        const selection = editor.state.selection.main;
        const anchor = text
          ? Y.createRelativePositionFromTypeIndex(text, selection.from)
          : null;
        const head = text
          ? Y.createRelativePositionFromTypeIndex(text, selection.to)
          : null;
        return (value: string) => {
          if (view.current !== editor || latest.current.disabled) return;
          const start =
            anchor && text?.doc
              ? Y.createAbsolutePositionFromRelativePosition(anchor, text.doc)
                  ?.index
              : selection.from;
          const end =
            head && text?.doc
              ? Y.createAbsolutePositionFromRelativePosition(head, text.doc)
                  ?.index
              : selection.to;
          if (start == null || end == null) return;
          editor.dispatch({
            changes: {
              from: Math.min(start, end),
              to: Math.max(start, end),
              insert: value,
            },
            scrollIntoView: true,
          });
          editor.focus();
        };
      },
    }),
    [view, latest, text, undo],
  );
}
