import { definePlugin } from "@everunfold/plugin-sdk";
import book from "./page";

export default definePlugin({
  id: "core.book",
  preview: "asset:assets/preview.webp",
  version: "1.0.0",
  title: "书籍页面",
  description: "用封面与纸页目录展示一个文章分类。",
  author: "Everunfold",
  setup({ pages, components }) {
    pages.register(book);
    for (const name of ["page", "cover", "category"])
      components.register(`core.book.${name}`);
  },
});
