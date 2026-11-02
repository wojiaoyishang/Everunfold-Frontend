"use client";
import { html } from "@codemirror/lang-html";
import {
  SourceBlockEditor,
  type BlockEditorProps,
} from "./source-block-editor";
const language = html();
const actions = [
  { label: "段落", text: "p", before: "<p>", after: "</p>" },
  { label: "强调", text: "strong", before: "<strong>", after: "</strong>" },
  { label: "标题", text: "h2", before: "<h2>", after: "</h2>" },
  { label: "超链接", text: "a", before: '<a href="https://">', after: "</a>" },
  { label: "列表", text: "ul", before: "<ul>\n  <li>", after: "</li>\n</ul>" },
] as const;
export default function HtmlEditor(props: BlockEditorProps) {
  return (
    <SourceBlockEditor
      {...props}
      language={language}
      actions={actions}
      format="HTML"
    />
  );
}
