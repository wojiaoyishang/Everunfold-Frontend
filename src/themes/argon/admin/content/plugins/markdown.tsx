"use client";
import { FileDropZone } from "../../../components/ui/file-drop-zone";
import {
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { UiText, useT } from "@/core/i18n/provider";
import { markdownEditorLanguage as language } from "@/core/editor/markdown-language";
import { Button } from "../../../components/ui/primitives";
import { RichTextEditor } from "../../../components/ui/rich-text-editor";
import { RichToolbar } from "./rich-toolbar";
import { EditorViewToggle } from "./editor-view-toggle";
import type {
  CodeEditorHandle,
  SourceSelection,
} from "../../../components/ui/code-editor";
import styles from "./markdown-editor.module.css";
import common from "./rich-editor.module.css";
import {
  SourceBlockEditor,
  type BlockEditorProps,
  type SourceAction,
} from "./source-block-editor";
import type { SourceShortcut } from "../../../components/ui/code-editor";
const actions = [
  {
    label: "加粗",
    icon: "bold",
    hint: "Ctrl/Cmd+B",
    command: { kind: "wrap", before: "**", after: "**", placeholder: "文字" },
  },
  {
    label: "斜体",
    icon: "italic",
    hint: "Ctrl/Cmd+I",
    command: { kind: "wrap", before: "*", after: "*", placeholder: "文字" },
  },
  {
    label: "删除线",
    icon: "strike",
    command: { kind: "wrap", before: "~~", after: "~~", placeholder: "文字" },
  },
  {
    label: "行内代码",
    icon: "code",
    command: { kind: "wrap", before: "`", after: "`", placeholder: "代码" },
  },
] as const satisfies readonly SourceAction[];
const inserts = [
  {
    label: "无序列表",
    icon: "list",
    command: { kind: "lines", style: "bullet" },
  },
  {
    label: "有序列表",
    icon: "ordered-list",
    command: { kind: "lines", style: "ordered" },
  },
  {
    label: "任务列表",
    icon: "checklist",
    command: { kind: "lines", style: "task" },
  },
  { label: "引用", icon: "quote", command: { kind: "lines", style: "quote" } },
  {
    label: "链接",
    icon: "link",
    command: {
      kind: "wrap",
      before: "[",
      after: "](https://)",
      placeholder: "链接文字",
    },
  },

  {
    label: "表格",
    icon: "table",
    command: {
      kind: "wrap",
      before: "| 列一 | 列二 |\n| --- | --- |\n| ",
      after: " | 内容 |",
      placeholder: "内容",
      block: true,
    },
  },
  {
    label: "分隔线",
    icon: "minus",
    command: { kind: "wrap", before: "\n---\n", after: "", block: true },
  },
] as const satisfies readonly SourceAction[];
const shortcuts: readonly SourceShortcut[] = [
  { key: "Mod-b", command: actions[0].command },
  { key: "Mod-i", command: actions[1].command },
];
const splitQuery = "(min-width: 801px)";
function subscribeSplitLayout(listener: () => void) {
  const query = matchMedia(splitQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const canSplitLayout = () => matchMedia(splitQuery).matches;
const serverSplitLayout = () => false;
const paneLabels = { source: "源码", visual: "可视化" } as const;
type Pane = keyof typeof paneLabels;

export default function MarkdownEditor(props: BlockEditorProps) {
  const t = useT();
  const [preferredMode, setMode] = useState<"write" | "split" | "visual">(
    "write",
  );
  const [statusTarget, setStatusTarget] = useState<HTMLDivElement | null>(null);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const [toolbarPane, setToolbarPane] = useState<Pane>("source");
  const wide = useSyncExternalStore(
    subscribeSplitLayout,
    canSplitLayout,
    serverSplitLayout,
  );
  const mode = preferredMode === "split" && !wide ? "visual" : preferredMode;
  const nextMode =
    mode === "write" ? "visual" : mode === "visual" && wide ? "split" : "write";
  const source = useRef<CodeEditorHandle | null>(null);
  const visual = useRef<CodeEditorHandle | null>(null);
  const focused = useRef<Pane>("source");
  const [selection, setSelection] = useState<{
    pane: Pane;
    range: SourceSelection;
  }>();
  const panes = useRef<HTMLDivElement>(null),
    visualPane = useRef<HTMLDivElement>(null),
    scrolling = useRef(false);
  const active = () =>
    mode === "visual" || (mode === "split" && focused.current === "visual")
      ? visual.current
      : source.current;
  const activate = (pane: Pane) => {
    focused.current = pane;
    setToolbarPane(pane);
  };
  const targetFor = (pane: Pane) =>
    mode === "split"
      ? toolbarPane === pane
        ? toolbarTarget
        : null
      : undefined;
  const switchView = (next: typeof mode) => {
    if (next === mode) return;
    const range = active()?.selection();
    const pane = next === "visual" ? "visual" : "source";
    activate(pane);
    setSelection(range ? { pane, range } : undefined);
    setMode(next);
  };
  useImperativeHandle(props.editorRef, () => ({
    focus: () => active()?.focus(),
    selection: () => active()?.selection() ?? { start: 0, end: 0 },
    select: (range) => active()?.select(range),
    reveal: (range) => active()?.reveal?.(range),
    insert: (before, after) => active()?.insert(before, after),
    captureInsertion: () => active()?.captureInsertion() ?? (() => {}),
  }));
  const syncScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (
      mode !== "split" ||
      scrolling.current ||
      !(event.target instanceof HTMLElement)
    )
      return;
    const from = event.target,
      cm = panes.current?.querySelector<HTMLElement>(".cm-scroller"),
      to =
        from === cm
          ? visualPane.current
          : from === visualPane.current
            ? cm
            : null;
    if (!to || from.scrollHeight <= from.clientHeight) return;
    scrolling.current = true;
    to.scrollTo({
      top:
        (from.scrollTop / (from.scrollHeight - from.clientHeight)) *
        (to.scrollHeight - to.clientHeight),
    });
    requestAnimationFrame(() => {
      scrolling.current = false;
    });
  };
  return (
    <FileDropZone
      capture
      disabled={props.disabled || !props.onUpload}
      onFiles={(files) => props.onUpload?.(files)}
    >
      {props.modeControls &&
        createPortal(
          <div
            className={common.tabs}
            role="group"
            aria-label={props.label + " Markdown 模式"}
          >
            <EditorViewToggle
              current={mode === "write" ? "source" : mode}
              next={nextMode === "write" ? "source" : nextMode}
              onToggle={() => switchView(nextMode)}
            />
          </div>,
          props.modeControls,
        )}
      {mode === "split" && (
        <div
          className={styles.toolbar}
          role="toolbar"
          aria-label={t("Markdown 共用工具栏")}
          data-editor-local-control
          data-shared-editor-toolbar
        >
          <div
            className={styles.toolbarPanes}
            role="group"
            aria-label={t("工具栏操作区域")}
          >
            {(["source", "visual"] as const).map((pane) => (
              <Button
                key={pane}
                aria-pressed={toolbarPane === pane}
                onClick={() => activate(pane)}
              >
                <UiText text={paneLabels[pane]} />
              </Button>
            ))}
          </div>
          <div className={styles.toolbarTools} ref={setToolbarTarget} />
        </div>
      )}
      <div
        className={styles.panes}
        data-mode={mode}
        ref={panes}
        onScrollCapture={syncScroll}
      >
        <div
          className={styles.sourcePane}
          inert={mode === "visual"}
          aria-hidden={mode === "visual"}
          onFocusCapture={(event) => {
            if (event.currentTarget.contains(event.target)) activate("source");
          }}
        >
          <SourceBlockEditor
            {...props}
            editorRef={source}
            statusTarget={statusTarget}
            toolbarTarget={targetFor("source")}
            hideStatusBar={mode === "visual"}
            initialSelection={
              selection?.pane === "source" ? selection.range : undefined
            }
            language={language}
            actions={actions}
            inserts={inserts}
            shortcuts={shortcuts}
            format="markdown"
          />
        </div>
        <div
          className={styles.visualPane}
          ref={visualPane}
          inert={mode === "write"}
          aria-hidden={mode === "write"}
          onFocusCapture={(event) => {
            if (event.currentTarget.contains(event.target)) activate("visual");
          }}
        >
          {mode !== "write" && (
            <RichTextEditor
              shared={props.shared}
              format="markdown"
              value={props.value}
              onChange={props.onChange}
              label={props.label + " Markdown 可视化"}
              disabled={props.disabled}
              initialSelection={
                selection?.pane === "visual" ? selection.range : undefined
              }
              editorRef={visual}
              statusTarget={statusTarget}
              toolbarTarget={targetFor("visual")}
              hideStatusBar={mode === "split"}
              media={props.media}
              toolbar={(editor) => (
                <RichToolbar
                  editor={editor}
                  markdown
                  grouped={mode === "split"}
                  onMedia={props.onMedia}
                  onShortcode={props.onShortcode}
                  onUpload={props.onUpload}
                />
              )}
            />
          )}
        </div>
      </div>
      <div
        ref={setStatusTarget}
        className={styles.status}
        data-editor-status-outlet
      />
    </FileDropZone>
  );
}
