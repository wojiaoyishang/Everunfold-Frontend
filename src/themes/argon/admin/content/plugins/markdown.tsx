"use client";
import {
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { markdownSourceLanguage as language } from "@/core/editor/visual-markdown";
import { RichTextEditor } from "../../../components/ui/rich-text-editor";
import { RichToolbar } from "./rich-toolbar";
import { Button } from "../../../components/ui/primitives";
import { ActionPopover } from "../../../components/ui/action-popover";
import { Icon } from "../../../components/icon";
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
    label: "代码块",
    icon: "code-block",
    command: {
      kind: "wrap",
      before: "```\n",
      after: "\n```",
      placeholder: "代码",
      block: true,
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
export default function MarkdownEditor(props: BlockEditorProps) {
  const [preferredMode, setMode] = useState<"write" | "split" | "visual">(
    "write",
  );
  const wide = useSyncExternalStore(
    subscribeSplitLayout,
    canSplitLayout,
    serverSplitLayout,
  );
  const mode = preferredMode === "split" && !wide ? "visual" : preferredMode;
  const source = useRef<CodeEditorHandle | null>(null);
  const visual = useRef<CodeEditorHandle | null>(null);
  const focused = useRef<"source" | "visual">("source");
  const [selection, setSelection] = useState<{
    pane: "source" | "visual";
    range: SourceSelection;
  }>();
  const panes = useRef<HTMLDivElement>(null),
    visualPane = useRef<HTMLDivElement>(null),
    scrolling = useRef(false);
  const active = () =>
    mode === "visual" || (mode === "split" && focused.current === "visual")
      ? visual.current
      : source.current;
  const switchView = (next: typeof mode) => {
    if (next === mode) return;
    const range = active()?.selection();
    const pane = next === "visual" ? "visual" : "source";
    setSelection(range ? { pane, range } : undefined);
    setMode(next);
  };
  useImperativeHandle(props.editorRef, () => ({
    focus: () => active()?.focus(),
    selection: () => active()?.selection() ?? { start: 0, end: 0 },
    select: (range) => active()?.select(range),
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
    <div>
      {props.modeControls &&
        createPortal(
          <div
            className={common.tabs}
            role="group"
            aria-label={props.label + " Markdown 模式"}
          >
            <Button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              aria-pressed={mode === "write"}
              onClick={() => switchView("write")}
            >
              <Icon name="edit" />
              编写
            </Button>
            <ActionPopover
              label="切换可视化布局"
              className={`${styles.viewButton} ${mode !== "write" ? styles.viewActive : ""}`}
              panelClassName={common.menu}
              panelWidth={200}
              triggerContent={
                <>
                  <Icon name={mode === "split" ? "sidebar" : "eye"} />
                  {mode === "split" ? "分屏" : "可视化"}
                  <Icon name="chevron" />
                </>
              }
            >
              {(close) => (
                <>
                  <Button
                    aria-pressed={mode === "visual"}
                    onClick={() => {
                      close();
                      switchView("visual");
                    }}
                  >
                    <Icon name="eye" /> 可视化
                    {mode === "visual" && <Icon name="check" />}
                  </Button>
                  <Button
                    aria-pressed={mode === "split"}
                    disabled={!wide}
                    title={wide ? undefined : "分屏需要更宽的窗口"}
                    onClick={() => {
                      close();
                      switchView("split");
                    }}
                  >
                    <Icon name="sidebar" /> 分屏
                    {mode === "split" && <Icon name="check" />}
                  </Button>
                </>
              )}
            </ActionPopover>
          </div>,
          props.modeControls,
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
          onFocusCapture={() => {
            focused.current = "source";
          }}
        >
          <SourceBlockEditor
            {...props}
            editorRef={source}
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
          onFocusCapture={() => {
            focused.current = "visual";
          }}
        >
          {mode !== "write" && (
            <RichTextEditor
              format="markdown"
              value={props.value}
              onChange={props.onChange}
              label={props.label + " Markdown 可视化"}
              disabled={props.disabled}
              initialSelection={
                selection?.pane === "visual" ? selection.range : undefined
              }
              editorRef={visual}
              media={props.media}
              toolbar={(editor) => (
                <RichToolbar
                  editor={editor}
                  markdown
                  onMedia={props.onMedia}
                  onUpload={props.onUpload}
                />
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
