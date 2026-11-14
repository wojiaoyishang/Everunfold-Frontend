"use client";
import { UiText } from "@/core/i18n/provider";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Extension } from "@codemirror/state";
import type { SharedSource } from "@/core/collaboration/editor-binding";
import type { UploadEntry } from "@/core/media/upload-queue";
import type { MediaItem } from "@/core/contracts/settings";
import type { MediaURL } from "@/core/contracts/content-admin";
import { EditorStatusBar } from "../../../components/ui/editor-status-bar";
import { Button } from "../../../components/ui/primitives";
import { Icon } from "../../../components/icon";
import {
  CodeEditor,
  type CodeEditorHandle,
  type SourceEditorHandle,
  type SourceSearch,
  type SourceShortcut,
  type SourceStatus,
  type SourceSelection,
} from "../../../components/ui/code-editor";
import styles from "./source-block-editor.module.css";
import { SourceToolbar, type SourceAction } from "./source-toolbar";
import { SourceSearchPanel } from "./source-search-panel";
import { sourceCodeSnippet } from "@/core/editor/code-snippet-selection";
import { featureSource } from "@/core/editor/content-feature-source";
export type { SourceAction } from "./source-toolbar";

export interface BlockEditorProps {
  shared?: SharedSource;
  value: string;
  onChange: (value: string, previous: string) => void;
  label: string;
  disabled: boolean;
  editorRef?: Ref<CodeEditorHandle>;
  media?: Record<string, MediaURL>;
  modeControls?: HTMLElement | null;
  initialSelection?: SourceSelection;
  autoFocus?: boolean;
  initialView?: "visual" | "source";
  onMedia?: (kind: "all" | "image" | "video") => void;
  onShortcode?: () => void;
  onUpload?: (files: File[]) => void;
  uploadStatus?: ReactNode;
  uploadEntries?: UploadEntry<MediaItem>[];
  statusTarget?: HTMLElement | null;
  hideStatusBar?: boolean;
}
const emptyStatus: SourceStatus = {
  line: 1,
  column: 1,
  selected: 0,
  matches: 0,
  currentMatch: 0,
  limited: false,
};

export function SourceBlockEditor({
  language,
  actions,
  inserts,
  format,
  shortcuts,
  editorRef,
  modeControls: _modeControls,
  initialSelection,
  autoFocus,
  uploadStatus,
  statusTarget,
  hideStatusBar,
  toolbarTarget,
  ...props
}: BlockEditorProps & {
  language: Extension;
  format: "markdown" | "html";
  actions: readonly SourceAction[];
  inserts: readonly SourceAction[];
  shortcuts: readonly SourceShortcut[];
  toolbarTarget?: HTMLElement | null;
}) {
  void _modeControls;
  const id = useId();
  const input = useRef<SourceEditorHandle | null>(null);
  const [status, setStatus] = useState(emptyStatus);
  const [wrapLines, setWrapLines] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState<SourceSearch>({
    search: "",
    replace: "",
    caseSensitive: false,
  });
  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);
  const closeSearch = () => {
    setSearchOpen(false);
    input.current?.focus();
  };
  useImperativeHandle(
    editorRef,
    () => ({
      focus: () => input.current?.focus(),
      select: (selection) => input.current?.select(selection),
      reveal: (selection) => input.current?.reveal?.(selection),
      selection: () => input.current?.selection() ?? { start: 0, end: 0 },
      insert: (before, after) => input.current?.insert(before, after),
      captureInsertion: () => input.current?.captureInsertion() ?? (() => {}),
    }),
    [],
  );
  useEffect(() => {
    if (!initialSelection && !autoFocus) return;
    // The child CodeMirror effect has already created its view. Applying now
    // avoids a later animation frame overriding the user's first key press.
    if (initialSelection) input.current?.select(initialSelection);
    else input.current?.focus();
  }, [initialSelection, autoFocus]);
  const currentLine = props.value.split("\n")[status.line - 1] ?? "";
  const heading =
    format === "markdown"
      ? (/^\s{0,3}(#{1,6})\s/.exec(currentLine)?.[1].length ?? 0)
      : Number(/^\s*<h([1-6])(?:\s|>)/i.exec(currentLine)?.[1] ?? 0);
  const toolbar = toolbarTarget !== null && (
    <SourceToolbar
      label={props.label}
      grouped={Boolean(toolbarTarget)}
      disabled={props.disabled}
      format={format}
      heading={heading}
      actions={actions}
      inserts={inserts}
      onMedia={props.onMedia}
      onShortcode={props.onShortcode}
      onUpload={props.onUpload}
      onFeature={(kind) => {
        let range = input.current?.selection() ?? { start: 0, end: 0 };
        const existing =
          kind === "code"
            ? sourceCodeSnippet(props.value, range, format)
            : undefined;
        if (existing) {
          range = existing.range;
          input.current?.select(range);
        }
        const insert = input.current?.captureInsertion();
        return {
          initial: existing?.initial ?? {
            source: props.value.slice(range.start, range.end),
          },
          apply: (value) => {
            const block = kind === "code" || value.display;
            const leading = !existing && block && range.start > 0 ? "\n\n" : "";
            const trailing = existing
              ? existing.suffix
              : block && range.end < props.value.length
                ? "\n\n"
                : "";
            insert?.(leading + featureSource(kind, value, format) + trailing);
          },
        };
      }}
      onCommand={(command) => input.current?.run(command)}
      onIndent={(direction) => input.current?.indent(direction)}
    />
  );
  return (
    <div className={styles.source} data-format={format}>
      {toolbarTarget ? createPortal(toolbar, toolbarTarget) : toolbar}
      {uploadStatus}
      <SourceSearchPanel
        id={id}
        label={props.label}
        open={searchOpen}
        disabled={props.disabled}
        query={query}
        status={status}
        onChange={setQuery}
        onClose={closeSearch}
        onFind={(direction) => input.current?.find(direction)}
        onReplace={(all) => input.current?.replace(all)}
      />
      <CodeEditor
        shared={props.shared}
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}
        label={props.label}
        language={language}
        ref={input}
        wrapLines={wrapLines}
        search={searchOpen ? query : undefined}
        shortcuts={shortcuts}
        onStatus={setStatus}
        onSearchRequest={openSearch}
      />
      <EditorStatusBar
        target={statusTarget}
        hidden={hideStatusBar}
        count={props.value.length}
        actions={
          <>
            <Button
              className={styles.statusButton}
              title="自动换行"
              aria-label="自动换行"
              aria-pressed={wrapLines}
              onClick={() => setWrapLines(!wrapLines)}
            >
              <Icon name="wrap" />
              <span>
                <UiText text="换行" />
              </span>
            </Button>
            <Button
              className={styles.statusButton}
              title="查找与替换 (Ctrl/Cmd+F)"
              aria-label="查找与替换"
              aria-expanded={searchOpen}
              aria-controls={id + "-search"}
              onClick={searchOpen ? closeSearch : openSearch}
            >
              <Icon name="search" />
              <span>
                <UiText text="查找" />
              </span>
            </Button>
          </>
        }
      >
        <span>
          <UiText text="行" />
          {status.line}
          <UiText text="，列" />
          {status.column}
          {status.selected ? " · 已选 " + status.selected + " 字符" : ""}
        </span>
      </EditorStatusBar>
    </div>
  );
}
