"use client";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { useImperativeHandle, useRef } from "react";
import { Button } from "../../../components/ui/primitives";
import { Icon } from "../../../components/icon";
import type { CodeEditorHandle } from "../../../components/ui/code-editor";
import { useEditorView } from "../../../hooks/use-editor-view";
import { BlockPreview } from "./block-preview";
import styles from "./markdown-editor.module.css";
import common from "./rich-editor.module.css";
import {
  SourceBlockEditor,
  type BlockEditorProps,
  type SourceAction,
} from "./source-block-editor";
import type { SourceShortcut } from "../../../components/ui/code-editor";
const language = markdown({ base: markdownLanguage });
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
export default function MarkdownEditor(props: BlockEditorProps) {
  const {
    view: mode,
    ref: viewRef,
    exiting,
    change,
  } = useEditorView<"write" | "split" | "preview">("write");
  const source = useRef<CodeEditorHandle | null>(null);
  const panes = useRef<HTMLDivElement>(null),
    preview = useRef<HTMLDivElement>(null),
    scrolling = useRef(false);
  useImperativeHandle(
    props.editorRef,
    () => ({
      focus: () => {
        change("write", () =>
          requestAnimationFrame(() => source.current?.focus()),
        );
      },
      selection: () => source.current?.selection() ?? { start: 0, end: 0 },
      insert: (before, after) => {
        change("write", () => source.current?.insert(before, after));
      },
      captureInsertion: () => {
        const insert = source.current?.captureInsertion() ?? (() => {});
        return (value) =>
          change("write", () => {
            insert(value);
            source.current?.focus();
          });
      },
    }),
    [change],
  );
  const syncScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (
      mode !== "split" ||
      scrolling.current ||
      !(event.target instanceof HTMLElement)
    )
      return;
    const from = event.target,
      cm = panes.current?.querySelector<HTMLElement>(".cm-scroller"),
      to = from === cm ? preview.current : from === preview.current ? cm : null;
    if (!to || from.scrollHeight <= from.clientHeight) return;
    scrolling.current = true;
    to.scrollTop =
      (from.scrollTop / (from.scrollHeight - from.clientHeight)) *
      (to.scrollHeight - to.clientHeight);
    requestAnimationFrame(() => {
      scrolling.current = false;
    });
  };
  return (
    <div>
      <div className={common.modeBar}>
        <div
          className={common.tabs}
          aria-label={props.label + " Markdown 模式"}
        >
          <Button
            aria-pressed={mode === "write"}
            onClick={() => change("write")}
          >
            <Icon name="edit" />
            编写
          </Button>
          <Button
            className={styles.splitButton}
            aria-pressed={mode === "split"}
            onClick={() => change("split")}
          >
            <Icon name="sidebar" />
            分屏
          </Button>
          <Button
            aria-pressed={mode === "preview"}
            onClick={() => change("preview")}
          >
            <Icon name="eye" />
            预览
          </Button>
        </div>
        <small>Markdown</small>
      </div>
      <div
        className={common.view}
        ref={viewRef}
        data-exiting={exiting}
        inert={exiting}
      >
        <div
          className={styles.panes}
          data-mode={mode}
          ref={panes}
          onScrollCapture={syncScroll}
        >
          <div
            className={styles.sourcePane}
            inert={mode === "preview"}
            aria-hidden={mode === "preview"}
          >
            <SourceBlockEditor
              {...props}
              editorRef={source}
              language={language}
              actions={actions}
              inserts={inserts}
              shortcuts={shortcuts}
              format="markdown"
            />
          </div>
          <div
            className={styles.previewPane}
            inert={mode === "write"}
            aria-hidden={mode === "write"}
          >
            <BlockPreview
              value={props.value}
              format="markdown"
              label={props.label + " Markdown 实时预览"}
              media={props.media}
              previewRef={preview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
