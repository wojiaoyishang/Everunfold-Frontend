"use client";
import { useEffect, useRef, type Ref } from "react";
import {
  Annotation,
  Transaction,
  Compartment,
  EditorState,
  type Extension,
} from "@codemirror/state";
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
import { collaborativeSource } from "@/core/collaboration/codemirror-binding";
import type { SharedSource } from "@/core/collaboration/editor-binding";
import {
  applySourceChanges,
  normalizeSourceLines,
  sourceSplice,
} from "@/core/editor/source-lines";
import styles from "./code-editor.module.css";
import presenceStyles from "./editor-presence.module.css";
import { useCodeEditorHandle } from "./use-code-editor-handle";
import { sourceHighlight } from "./source-highlight";

const externalSource = Annotation.define<boolean>();
export type SourceSelection = { start: number; end: number };
export type CapturedInsertion = ((value: string) => boolean | void) & {
  dispose?: () => void;
};
export interface CodeEditorHandle {
  focus: () => void;
  selection: () => SourceSelection;
  select: (selection: SourceSelection) => void;
  reveal?: (selection: SourceSelection) => void;
  insert: (before: string, after?: string) => void;
  captureInsertion: () => CapturedInsertion;
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
export type { SharedSource } from "@/core/collaboration/editor-binding";
export interface CodeEditorProps {
  value: string;
  onChange: (value: string, previous: string) => void;
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
  const raw = useRef(value);
  const latest = useRef({
    value,
    onChange,
    disabled,
    label,
    onStatus,
    onSearchRequest,
    language,
  });
  useEffect(() => {
    latest.current = {
      value,
      onChange,
      disabled,
      label,
      onStatus,
      onSearchRequest,
      language,
    };
  }, [value, onChange, disabled, label, onStatus, onSearchRequest, language]);
  const text = shared?.text,
    awareness = shared?.awareness,
    undo = shared?.undo,
    blockId = shared?.blockId;
  const editable = useRef(new Compartment());
  const wrapping = useRef(new Compartment());
  const syntax = useRef(new Compartment());
  useCodeEditorHandle(ref, view, latest, raw, text, undo);
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
        selected: Math.max(0, selection.to - selection.from),
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
          syntax.current.of(latest.current.language),
          wrapping.current.of(EditorView.lineWrapping),
          editable.current.of([
            EditorView.editable.of(!latest.current.disabled),
            EditorState.readOnly.of(Boolean(latest.current.disabled)),
          ]),
          EditorView.contentAttributes.of({
            ...(!text ? { "data-editor-local-control": "true" } : {}),
            "aria-label": latest.current.label,
            "aria-multiline": "true",
            spellcheck: "false",
          }),
          shared ? collaborativeSource(shared, raw) : history(),
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
            ...(text && undo
              ? [
                  {
                    key: "Mod-z",
                    run: (view: EditorView) => {
                      if (view.state.readOnly) return false;
                      if (!undo.canUndo()) return false;
                      undo.undo();
                      return true;
                    },
                  },
                  {
                    key: "Mod-Shift-z",
                    run: (view: EditorView) => {
                      if (view.state.readOnly) return false;
                      if (!undo.canRedo()) return false;
                      undo.redo();
                      return true;
                    },
                  },
                  {
                    key: "Mod-y",
                    run: (view: EditorView) => {
                      if (view.state.readOnly) return false;
                      if (!undo.canRedo()) return false;
                      undo.redo();
                      return true;
                    },
                  },
                ]
              : historyKeymap),
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
            if (
              update.docChanged &&
              !text &&
              !update.transactions.some((tr) => tr.annotation(externalSource))
            ) {
              const previous = raw.current;
              raw.current = previous.includes("\r")
                ? applySourceChanges(previous, update.changes)
                : update.state.doc.toString();
              latest.current.onChange(raw.current, previous);
            }
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
  }, [text, awareness, undo, blockId, shortcuts, shared]);
  useEffect(() => {
    view.current?.dispatch({ effects: syntax.current.reconfigure(language) });
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
    const apply = () =>
      editor.dispatch({
        effects: editable.current.reconfigure([
          EditorView.editable.of(!disabled),
          EditorState.readOnly.of(Boolean(disabled)),
        ]),
      });
    if (disabled && editor.composing) {
      const finish = () => queueMicrotask(apply);
      editor.contentDOM.addEventListener("compositionend", finish, {
        once: true,
      });
      editor.contentDOM.addEventListener("blur", finish, { once: true });
      return () => {
        editor.contentDOM.removeEventListener("compositionend", finish);
        editor.contentDOM.removeEventListener("blur", finish);
      };
    }
    apply();
  }, [disabled, label, language, text, awareness, undo, blockId, shortcuts]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    if (!text) {
      raw.current = value;
      const normalized = normalizeSourceLines(value);
      const current = editor.state.doc.toString();
      if (current !== normalized)
        editor.dispatch({
          changes: sourceSplice(current, normalized),
          annotations: [
            externalSource.of(true),
            Transaction.addToHistory.of(false),
          ],
        });
    }
  }, [value, text]);
  return (
    <div
      className={`${styles.editor} ${presenceStyles.presence}`}
      ref={host}
      data-disabled={disabled || undefined}
    />
  );
}
