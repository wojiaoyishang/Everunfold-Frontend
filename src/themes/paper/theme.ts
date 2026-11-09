import type { ThemeDefinition } from "@/core/extensions/types";

/** A CSS-only starting point: inherit Argon's components, templates and hooks. */
export default {
  id: "paper",
  title: "Paper",
  description: "继承 Argon 的简约子主题，适合二次开发。",
  preview: "/reference/themes/paper.svg",
  author: {
    name: "Everunfold contributors",
    url: "https://github.com/wojiaoyishang",
  },
  repository: "https://github.com/wojiaoyishang/Everunfold-Frontend",
  version: "2.0.0",
  parent: "argon",
  styles: true,
} satisfies ThemeDefinition;
