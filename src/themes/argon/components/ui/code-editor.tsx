"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import styles from "./code-editor.module.css";

const sourceHighlight = HighlightStyle.define([
  { tag: tags.heading, color: "var(--admin-text)", fontWeight: "600" },
  {
    tag: [tags.keyword, tags.tagName, tags.attributeName, tags.operator],
    color: "var(--admin-accent)",
  },
  {
    tag: [tags.string, tags.number, tags.bool, tags.special(tags.string)],
    color: "var(--admin-positive)",
  },
  {
    tag: [tags.comment, tags.meta, tags.processingInstruction],
    color: "var(--admin-muted)",
  },
  { tag: tags.link, color: "var(--admin-accent)", textDecoration: "underline" },
  { tag: tags.strong, fontWeight: "600" },
  { tag: tags.emphasis, fontStyle: "italic" },
]);

export interface CodeEditorHandle {
  focus: () => void;
  selection: () => { start: number; end: number };
  insert: (before: string, after?: string) => void;
  captureInsertion: () => (value: string) => void;
}
export interface SharedSource {
  text: Y.Text;
  awareness: Awareness;
  undo: Y.UndoManager;
  blockId: string;
}
export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  language: Extension;
  disabled?: boolean;
  shared?: SharedSource;
  ref?: Ref<CodeEditorHandle>;
}

/** Owns all native contenteditable, selection, keyboard and CRDT bindings. */
export function CodeEditor({
  value,
  onChange,
  label,
  language,
  disabled,
  shared,
  ref,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const latest = useRef({ value, onChange, disabled, label });
  useEffect(() => {
    latest.current = { value, onChange, disabled, label };
  }, [value, onChange, disabled, label]);
  const text = shared?.text,
    awareness = shared?.awareness,
    undo = shared?.undo,
    blockId = shared?.blockId;
  const editable = useRef(new Compartment());
  useImperativeHandle(
    ref,
    () => ({
      focus: () => view.current?.focus(),
      selection: () => {
        const sel = view.current?.state.selection.main;
        return { start: sel?.from ?? 0, end: sel?.to ?? 0 };
      },
      insert: (before, after = "") => {
        const editor = view.current;
        if (!editor || latest.current.disabled) return;
        const { from, to } = editor.state.selection.main;
        const selected = editor.state.sliceDoc(from, to);
        editor.dispatch({
          changes: { from, to, insert: before + selected + after },
          selection: {
            anchor: from + before.length,
            head: from + before.length + selected.length,
          },
          scrollIntoView: true,
        });
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
    [text],
  );
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: text ? text.toString() : latest.current.value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          bracketMatching(),
          syntaxHighlighting(sourceHighlight),
          language,
          EditorView.lineWrapping,
          editable.current.of([
            EditorView.editable.of(!latest.current.disabled),
            EditorState.readOnly.of(Boolean(latest.current.disabled)),
          ]),
          EditorView.contentAttributes.of({
            "aria-label": latest.current.label,
            "aria-multiline": "true",
            spellcheck: "false",
          }),
          text && awareness && undo
            ? yCollab(text, awareness, {
                undoManager: undo,
              })
            : history(),
          keymap.of([
            ...(text ? yUndoManagerKeymap : historyKeymap),
            ...defaultKeymap,
            indentWithTab,
          ]),
          EditorView.domEventHandlers({
            focus: () => {
              if (undo && awareness) {
                undo.stopCapturing();
                awareness.setLocalStateField("blockId", blockId);
              }
              return false;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !text)
              latest.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      view.current = null;
      editor.destroy();
    };
  }, [language, text, awareness, undo, blockId]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    editor.contentDOM.setAttribute("aria-label", label);
    editor.dispatch({
      effects: editable.current.reconfigure([
        EditorView.editable.of(!disabled),
        EditorState.readOnly.of(Boolean(disabled)),
      ]),
    });
    if (!text && editor.state.doc.toString() !== value)
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
  }, [disabled, value, text, label]);
  return (
    <div
      className={styles.editor}
      ref={host}
      data-disabled={disabled || undefined}
    />
  );
}
