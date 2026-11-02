"use client";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
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
  return (
    <SourceBlockEditor
      {...props}
      language={language}
      actions={actions}
      inserts={inserts}
      shortcuts={shortcuts}
      format="markdown"
    />
  );
}
