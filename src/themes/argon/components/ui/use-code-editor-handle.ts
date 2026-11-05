"use client";
import { useImperativeHandle, type Ref, type RefObject } from "react";
import { EditorView } from "@codemirror/view";
import { indentMore, indentLess, isolateHistory } from "@codemirror/commands";
import {
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
} from "@codemirror/search";
import {
  normalizedSourceOffset,
  rawSourceOffset,
} from "@/core/editor/source-lines";
import { sourceCommand } from "@/core/editor/source-commands";
import * as Y from "yjs";
import type { SourceEditorHandle } from "./code-editor";
import { revealEditorSelection } from "./reveal-editor-selection";
import { capturedSourceRange } from "@/core/editor/captured-source-range";
/** Imperative commands stay inside the encapsulated source control. */
export function useCodeEditorHandle(
  ref: Ref<SourceEditorHandle> | undefined,
  view: RefObject<EditorView | null>,
  latest: RefObject<{ disabled?: boolean }>,
  raw: RefObject<string>,
  text: Y.Text | undefined,
  undo: Y.UndoManager | undefined,
) {
  useImperativeHandle(
    ref,
    () => ({
      focus: () => view.current?.focus(),
      select: ({ start, end }) => {
        const editor = view.current;
        if (!editor) return;
        const size = editor.state.doc.length;
        editor.dispatch({
          selection: {
            anchor: Math.min(normalizedSourceOffset(raw.current, start), size),
            head: Math.min(normalizedSourceOffset(raw.current, end), size),
          },
          scrollIntoView: true,
        });
        editor.focus();
        revealEditorSelection(editor.dom, () =>
          editor.coordsAtPos(editor.state.selection.main.head),
        );
      },
      selection: () => {
        const sel = view.current?.state.selection.main;
        const start = sel?.from ?? 0,
          end = sel?.to ?? 0;
        return {
          start: rawSourceOffset(raw.current, start),
          end: rawSourceOffset(raw.current, end),
        };
      },
      reveal: ({ end }) => {
        const editor = view.current;
        if (!editor) return;
        const position = Math.min(
          normalizedSourceOffset(raw.current, end),
          editor.state.doc.length,
        );
        editor.dispatch({
          effects: EditorView.scrollIntoView(position, { y: "center" }),
        });
        revealEditorSelection(
          editor.dom,
          () => editor.coordsAtPos(position),
          false,
        );
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
        const base = editor.state.doc.toString();
        const anchor = text
          ? Y.createRelativePositionFromTypeIndex(
              text,
              rawSourceOffset(raw.current, selection.from),
            )
          : null;
        const head = text
          ? Y.createRelativePositionFromTypeIndex(
              text,
              rawSourceOffset(raw.current, selection.to),
            )
          : null;
        return (value: string) => {
          if (view.current !== editor || latest.current.disabled) return false;
          const rebased = text
            ? null
            : capturedSourceRange(base, editor.state.doc.toString(), {
                start: selection.from,
                end: selection.to,
              });
          if (!text && !rebased) return false;
          const rawStart =
            anchor && text?.doc
              ? Y.createAbsolutePositionFromRelativePosition(anchor, text.doc)
                  ?.index
              : rebased?.start;
          const rawEnd =
            head && text?.doc
              ? Y.createAbsolutePositionFromRelativePosition(head, text.doc)
                  ?.index
              : rebased?.end;
          if (rawStart == null || rawEnd == null) return false;
          const start = text
            ? normalizedSourceOffset(raw.current, rawStart)
            : rawStart;
          const end = text
            ? normalizedSourceOffset(raw.current, rawEnd)
            : rawEnd;
          editor.dispatch({
            changes: {
              from: Math.min(start, end),
              to: Math.max(start, end),
              insert: value,
            },
            selection: { anchor: Math.min(start, end) + value.length },
            scrollIntoView: true,
          });
          editor.focus();
          return true;
        };
      },
    }),
    [view, latest, raw, text, undo],
  );
}
