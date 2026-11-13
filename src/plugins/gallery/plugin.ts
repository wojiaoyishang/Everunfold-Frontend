import type { FrontendPlugin } from "@everunfold/plugin-sdk";
import { gallery } from "./shortcode";

export default {
  id: "core.gallery",
  preview: "asset:assets/preview.webp",
  version: "1.0.0",
  title: "图片画廊",
  description: "原生画廊短代码与媒体选择",
  author: "Everunfold",
  readme:
    "## 功能\n\n原生画廊短代码与媒体选择。\n\n## 使用\n\n启用后，对应的页面、编辑器工具或组件会出现在相关入口。配置与历史内容在停用时保留。",
  setup({ shortcodes, builder }) {
    shortcodes.register(gallery);
    builder.register({
      type: "core.gallery.images",
      label: "图片画廊",
      group: "media",
      shortcode: "gallery",
      fields: [
        {
          key: "id",
          label: "图片",
          type: "media",
          default: "",
          multiple: true,
        },
        {
          key: "columns",
          label: "列数",
          type: "select",
          default: "3",
          options: [
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
          ],
        },
      ],
    });
  },
} satisfies FrontendPlugin;
