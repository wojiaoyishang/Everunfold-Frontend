import type { FrontendPlugin } from "@everunfold/plugin-sdk";
import { gallery } from "./shortcode";

export default {
  id: "core.gallery",
  version: "1.0.0",
  title: "图片画廊",
  description: "原生画廊短代码与媒体选择",
  author: "Everunfold",
  readme:
    "## 功能\n\n原生画廊短代码与媒体选择。\n\n## 使用\n\n启用后，对应的页面、编辑器工具或组件会出现在相关入口。配置与历史内容在停用时保留。",
  setup({ shortcodes }) {
    shortcodes.register(gallery);
  },
} satisfies FrontendPlugin;
