import type { FrontendPlugin } from "@everunfold/plugin-sdk";
import people from "./page";

export default {
  id: "core.people",
  preview: "asset:assets/preview.webp",
  version: "1.0.0",
  title: "人物与寄语",
  description: "人物分组、姓名云、卡片与寄语弹窗",
  author: "Everunfold",
  readme:
    "## 功能\n\n人物分组、姓名云、卡片与寄语弹窗。\n\n## 使用\n\n启用后，对应的页面、编辑器工具或组件会出现在相关入口。配置与历史内容在停用时保留。",
  setup({ pages, components }) {
    pages.register(people);
    components.register("core.people.page");
    components.register("core.people.message");
  },
} satisfies FrontendPlugin;
