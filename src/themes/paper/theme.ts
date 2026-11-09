import type { ThemeDefinition } from "@/core/extensions/types";
import { defineFont } from "@/core/fonts";

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
  version: "2.0.1",
  parent: "argon",
  styles: true,
  fonts: [
    defineFont({
      id: "paper.ui",
      label: "Paper UI",
      fallbacks: [
        "system-ui",
        "Segoe UI",
        "PingFang SC",
        "Microsoft YaHei",
        "sans-serif",
      ],
    }),
  ],
  typography: { body: "paper.ui", heading: "paper.ui", code: "system.mono" },
} satisfies ThemeDefinition;
