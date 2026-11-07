import { definePlugin } from "@everunfold/plugin-sdk";
import page from "./page";

export default definePlugin({
  id: "core.honors",
  version: "1.0.0",
  title: "荣誉与证书",
  description: "分类荣誉墙、时间筛选与证书查看",
  setup({ pages, components }) {
    pages.register(page);
    for (const name of ["page", "field", "image"])
      components.register(`core.honors.${name}`);
  },
});
