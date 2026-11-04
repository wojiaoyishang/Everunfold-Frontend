"use client";
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
import type { Extension } from "@codemirror/state";
import type { UploadEntry } from "@/core/media/upload-queue";
import type { MediaItem } from "@/generated/settings-contract";
import type { MediaURL } from "@/generated/content-admin-contract";
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
import { featureSource } from "@/core/editor/content-feature-source";
export type { SourceAction } from "./source-toolbar";

export interface BlockEditorProps {
  value: string;
  onChange: (value: string, previous: string) => void;
  label: string;
  disabled: boolean;
  editorRef?: Ref<CodeEditorHandle>;
  media?: Record<string, MediaURL>;
  modeControls?: HTMLElement | null;
  initialSelection?: SourceSelection;
  onMedia?: (kind: "all" | "image") => void;
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
  uploadStatus,
  statusTarget,
  hideStatusBar,
  ...props
}: BlockEditorProps & {
  language: Extension;
  format: "markdown" | "html";
  actions: readonly SourceAction[];
  inserts: readonly SourceAction[];
  shortcuts: readonly SourceShortcut[];
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
      selection: () => input.current?.selection() ?? { start: 0, end: 0 },
      insert: (before, after) => input.current?.insert(before, after),
      captureInsertion: () => input.current?.captureInsertion() ?? (() => {}),
    }),
    [],
  );
  useEffect(() => {
    if (!initialSelection) return;
    const frame = requestAnimationFrame(() =>
      input.current?.select(initialSelection),
    );
    return () => cancelAnimationFrame(frame);
  }, [initialSelection]);
  const currentLine = props.value.split("\n")[status.line - 1] ?? "";
  const heading =
    format === "markdown"
      ? (/^\s{0,3}(#{1,6})\s/.exec(currentLine)?.[1].length ?? 0)
      : Number(/^\s*<h([1-6])(?:\s|>)/i.exec(currentLine)?.[1] ?? 0);
  return (
    <div className={styles.source} data-format={format}>
      <SourceToolbar
        label={props.label}
        disabled={props.disabled}
        format={format}
        heading={heading}
        actions={actions}
        inserts={inserts}
        onMedia={props.onMedia}
        onUpload={props.onUpload}
        onFeature={(kind) => {
          const range = input.current?.selection() ?? { start: 0, end: 0 };
          const insert = input.current?.captureInsertion();
          return {
            initial: { source: props.value.slice(range.start, range.end) },
            apply: (value) => {
              const block = kind === "code" || value.display;
              const leading = block && range.start > 0 ? "\n\n" : "";
              const trailing =
                block && range.end < props.value.length ? "\n\n" : "";
              insert?.(leading + featureSource(kind, value, format) + trailing);
            },
          };
        }}
        onCommand={(command) => input.current?.run(command)}
        onIndent={(direction) => input.current?.indent(direction)}
      />
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
              <span>换行</span>
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
              <span>查找</span>
            </Button>
          </>
        }
      >
        <span>
          行 {status.line}，列 {status.column}
          {status.selected ? " · 已选 " + status.selected + " 字符" : ""}
        </span>
      </EditorStatusBar>
    </div>
  );
}
