"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { createBlockEditorRegistry } from "@/core/editor/registry";
import type { BlockEditorProps } from "./source-block-editor";
const MarkdownEditor = dynamic(() => import("./markdown"), { ssr: false });
const HtmlEditor = dynamic(() => import("./html"), { ssr: false });
export const blockEditors = createBlockEditorRegistry<
  ComponentType<BlockEditorProps>
>([
  {
    id: "core.markdown",
    version: "2.0.0",
    format: "markdown",
    label: "Markdown",
    description: "标题、列表与轻量标记",
    adapter: MarkdownEditor,
  },
  {
    id: "core.html",
    version: "2.0.0",
    format: "html",
    label: "HTML",
    description: "可视化排版与 HTML 源码",
    adapter: HtmlEditor,
  },
]);
export function RegisteredBlockEditor({
  format,
  ...props
}: BlockEditorProps & { format: string }) {
  const plugin = blockEditors.get(format);
  if (!plugin) return <p role="alert">此块的编辑器未注册，原内容已保留。</p>;
  const Adapter = plugin.adapter;
  return <Adapter {...props} />;
}
