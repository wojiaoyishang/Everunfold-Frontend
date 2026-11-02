"use client";
import { html } from "@codemirror/lang-html";
import {
  SourceBlockEditor,
  type BlockEditorProps,
  type SourceAction,
} from "./source-block-editor";
import type { SourceShortcut } from "../../../components/ui/code-editor";
const language = html();
const actions = [
  {
    label: "加粗",
    icon: "bold",
    hint: "Ctrl/Cmd+B",
    command: {
      kind: "wrap",
      before: "<strong>",
      after: "</strong>",
      placeholder: "文字",
    },
  },
  {
    label: "斜体",
    icon: "italic",
    hint: "Ctrl/Cmd+I",
    command: {
      kind: "wrap",
      before: "<em>",
      after: "</em>",
      placeholder: "文字",
    },
  },
  {
    label: "删除线",
    icon: "strike",
    command: {
      kind: "wrap",
      before: "<del>",
      after: "</del>",
      placeholder: "文字",
    },
  },
  {
    label: "行内代码",
    icon: "code",
    command: {
      kind: "wrap",
      before: "<code>",
      after: "</code>",
      placeholder: "代码",
    },
  },
] as const satisfies readonly SourceAction[];
const inserts = [
  {
    label: "无序列表",
    icon: "list",
    command: {
      kind: "wrap",
      before: "<ul>\n  <li>",
      after: "</li>\n</ul>",
      placeholder: "列表项",
      block: true,
    },
  },
  {
    label: "有序列表",
    icon: "ordered-list",
    command: {
      kind: "wrap",
      before: "<ol>\n  <li>",
      after: "</li>\n</ol>",
      placeholder: "列表项",
      block: true,
    },
  },
  {
    label: "引用",
    icon: "quote",
    command: {
      kind: "wrap",
      before: "<blockquote>\n  <p>",
      after: "</p>\n</blockquote>",
      placeholder: "引用内容",
      block: true,
    },
  },
  {
    label: "链接",
    icon: "link",
    command: {
      kind: "wrap",
      before: '<a href="https://">',
      after: "</a>",
      placeholder: "链接文字",
    },
  },
  {
    label: "代码块",
    icon: "code-block",
    command: {
      kind: "wrap",
      before: "<pre><code>",
      after: "</code></pre>",
      placeholder: "代码",
      block: true,
      escapeHtml: true,
    },
  },
  {
    label: "表格",
    icon: "table",
    command: {
      kind: "wrap",
      before:
        "<table>\n  <thead><tr><th>列一</th><th>列二</th></tr></thead>\n  <tbody><tr><td>",
      after: "</td><td>内容</td></tr></tbody>\n</table>",
      placeholder: "内容",
      block: true,
    },
  },
  {
    label: "分隔线",
    icon: "minus",
    command: { kind: "wrap", before: "\n<hr>\n", after: "", block: true },
  },
] as const satisfies readonly SourceAction[];
const shortcuts: readonly SourceShortcut[] = [
  { key: "Mod-b", command: actions[0].command },
  { key: "Mod-i", command: actions[1].command },
];
export default function HtmlEditor(props: BlockEditorProps) {
  return (
    <SourceBlockEditor
      {...props}
      language={language}
      actions={actions}
      inserts={inserts}
      shortcuts={shortcuts}
      format="html"
    />
  );
}
