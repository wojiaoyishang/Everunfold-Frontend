"use client";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import type { Extension } from "@codemirror/state";
import type { MediaURL } from "@/generated/content-admin-contract";
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
        onCommand={(command) => input.current?.run(command)}
        onIndent={(direction) => input.current?.indent(direction)}
      />
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
        {...props}
        language={language}
        ref={input}
        wrapLines={wrapLines}
        search={searchOpen ? query : undefined}
        shortcuts={shortcuts}
        onStatus={setStatus}
        onSearchRequest={openSearch}
      />
      <div className={styles.status}>
        <span>
          行 {status.line}，列 {status.column}
          {status.selected ? " · 已选 " + status.selected + " 字符" : ""}
        </span>
        <div>
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
        </div>
      </div>
    </div>
  );
}
