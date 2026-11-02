"use client";
import { markdown } from "@codemirror/lang-markdown";
import {
  SourceBlockEditor,
  type BlockEditorProps,
} from "./source-block-editor";
const language = markdown();
const actions = [
  { label: "加粗", text: "B", before: "**", after: "**" },
  { label: "斜体", text: "I", before: "*", after: "*" },
  { label: "二级标题", text: "H2", before: "\n## " },
  { label: "插入链接", text: "链接", before: "[", after: "](https://)" },
  { label: "引用", text: "引用", before: "\n> " },
  { label: "代码块", text: "代码", before: "\n```\n", after: "\n```\n" },
] as const;
export default function MarkdownEditor(props: BlockEditorProps) {
  return (
    <SourceBlockEditor
      {...props}
      language={language}
      actions={actions}
      format="Markdown"
    />
  );
}
