"use client";
import { useEffect, useRef, type Ref } from "react";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  isolateHistory,
} from "@codemirror/commands";
import {
  bracketMatching,
  HighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  indentUnit,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  search as searchExtension,
  SearchQuery,
  getSearchQuery,
  setSearchQuery,
} from "@codemirror/search";
import {
  sourceCommand,
  type SourceCommand,
} from "@/core/editor/source-commands";
import { sourceSearchHighlights } from "@/core/editor/source-search";
import { tags } from "@lezer/highlight";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import type { DraftSession } from "@/core/collaboration/session";
import styles from "./code-editor.module.css";
import { useCodeEditorHandle } from "./use-code-editor-handle";

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
export interface SourceSearch {
  search: string;
  replace: string;
  caseSensitive: boolean;
}
export interface SourceStatus {
  line: number;
  column: number;
  selected: number;
  matches: number;
  currentMatch: number;
  limited: boolean;
}
export interface SourceEditorHandle extends CodeEditorHandle {
  run: (command: SourceCommand) => void;
  find: (direction: -1 | 1) => void;
  replace: (all?: boolean) => void;
  indent: (direction: -1 | 1) => void;
}
export interface SourceShortcut {
  key: string;
  command: SourceCommand;
}
export interface SharedSource {
  text: Y.Text;
  awareness: Awareness;
  undo: Y.UndoManager;
  blockId: string;
  rich?: Y.XmlFragment;
  host?: DraftSession;
}
export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  language: Extension;
  disabled?: boolean;
  shared?: SharedSource;
  wrapLines?: boolean;
  search?: SourceSearch;
  shortcuts?: readonly SourceShortcut[];
  onStatus?: (status: SourceStatus) => void;
  onSearchRequest?: () => void;
  ref?: Ref<SourceEditorHandle>;
}

/** Owns all native contenteditable, selection, keyboard and CRDT bindings. */
export function CodeEditor({
  value,
  onChange,
  label,
  language,
  disabled,
  shared,
  wrapLines = true,
  search,
  shortcuts,
  onStatus,
  onSearchRequest,
  ref,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const latest = useRef({
    value,
    onChange,
    disabled,
    label,
    onStatus,
    onSearchRequest,
  });
  useEffect(() => {
    latest.current = {
      value,
      onChange,
      disabled,
      label,
      onStatus,
      onSearchRequest,
    };
  }, [value, onChange, disabled, label, onStatus, onSearchRequest]);
  const text = shared?.text,
    awareness = shared?.awareness,
    undo = shared?.undo,
    blockId = shared?.blockId;
  const editable = useRef(new Compartment());
  const wrapping = useRef(new Compartment());
  useCodeEditorHandle(ref, view, latest, text, undo);
  useEffect(() => {
    if (!host.current) return;
    let matches: { from: number; to: number }[] = [],
      limited = false;
    function report(editor: EditorView, recalculate = false) {
      if (recalculate) {
        matches = [];
        const query = getSearchQuery(editor.state);
        if (query.valid) {
          const cursor = query.getCursor(editor.state);
          for (
            let step = cursor.next();
            !step.done && matches.length < 1001;
            step = cursor.next()
          )
            matches.push(step.value);
        }
        limited = matches.length > 1000;
        if (limited) matches.length = 1000;
      }
      const selection = editor.state.selection.main;
      const line = editor.state.doc.lineAt(selection.head);
      latest.current.onStatus?.({
        line: line.number,
        column: selection.head - line.from + 1,
        selected: selection.to - selection.from,
        matches: matches.length,
        currentMatch:
          matches.findIndex(
            (match) =>
              match.from === selection.from && match.to === selection.to,
          ) + 1,
        limited,
      });
    }
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: text ? text.toString() : latest.current.value,
        extensions: [
          EditorState.phrases.of({
            Completions: "补全建议",
            "replaced $ matches.": "已替换 $ 处内容。",
          }),
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          drawSelection(),
          bracketMatching(),
          closeBrackets(),
          autocompletion({
            defaultKeymap: false,
            icons: false,
            maxRenderedOptions: 8,
          }),
          indentOnInput(),
          indentUnit.of("  "),
          searchExtension(),
          sourceSearchHighlights,
          syntaxHighlighting(sourceHighlight),
          language,
          wrapping.current.of(EditorView.lineWrapping),
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
            {
              key: "Mod-f",
              run: () => {
                latest.current.onSearchRequest?.();
                return Boolean(latest.current.onSearchRequest);
              },
            },
            ...(shortcuts ?? []).map((shortcut) => ({
              key: shortcut.key,
              run: (view: EditorView) => {
                if (view.state.readOnly) return false;
                undo?.stopCapturing();
                view.dispatch({
                  ...sourceCommand(view.state, shortcut.command),
                  annotations: isolateHistory.of("full"),
                });
                undo?.stopCapturing();
                return true;
              },
            })),
            ...completionKeymap,
            ...closeBracketsKeymap,
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
            const queryChanged = update.transactions.some((tr) =>
              tr.effects.some((effect) => effect.is(setSearchQuery)),
            );
            if (update.docChanged || update.selectionSet || queryChanged)
              report(update.view, update.docChanged || queryChanged);
          }),
        ],
      }),
    });
    view.current = editor;
    report(editor, true);
    return () => {
      view.current = null;
      editor.destroy();
    };
  }, [language, text, awareness, undo, blockId, shortcuts]);
  useEffect(() => {
    view.current?.dispatch({
      effects: wrapping.current.reconfigure(
        wrapLines ? EditorView.lineWrapping : [],
      ),
    });
  }, [wrapLines, language, text, awareness, undo, blockId, shortcuts]);
  useEffect(() => {
    view.current?.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: search?.search ?? "",
          replace: search?.replace ?? "",
          caseSensitive: search?.caseSensitive,
          literal: true,
        }),
      ),
    });
  }, [search, language, text, awareness, undo, blockId, shortcuts]);
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
  }, [disabled, label, language, text, awareness, undo, blockId, shortcuts]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    if (!text && editor.state.doc.toString() !== value)
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
  }, [value, text]);
  return (
    <div
      className={styles.editor}
      ref={host}
      data-disabled={disabled || undefined}
    />
  );
}
