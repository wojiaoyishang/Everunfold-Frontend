import { definePlugin } from "@everunfold/plugin-sdk";
import page from "./page";

export default definePlugin({
  id: "core.honors",
  preview: "asset:assets/preview.webp",
  version: "1.0.0",
  title: "荣誉与证书",
  description: "分类荣誉墙、时间筛选与证书查看",
  author: "Everunfold",
  readme:
    "## 功能\n\n分类荣誉墙、时间筛选与证书查看。\n\n## 使用\n\n启用后，对应的页面、编辑器工具或组件会出现在相关入口。配置与历史内容在停用时保留。",
  setup({ pages, components }) {
    pages.register(page);
    for (const name of ["page", "field", "image"])
      components.register(`core.honors.${name}`);
  },
});
