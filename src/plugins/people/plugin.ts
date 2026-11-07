import type { FrontendPlugin } from "@everunfold/plugin-sdk";
import people from "./page";

export default {
  id: "core.people",
  version: "1.0.0",
  title: "人物与寄语",
  description: "人物分组、姓名云、卡片与寄语弹窗",
  setup({ pages, components }) {
    pages.register(people);
    components.register("core.people.page");
    components.register("core.people.message");
  },
} satisfies FrontendPlugin;
