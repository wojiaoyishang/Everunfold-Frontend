import { defineFont } from "./registry";

/** System stacks do not contain downloadable files. */
export const builtinFonts = [
  defineFont({
    id: "system.sans",
    label: "System Sans",
    fallbacks: [
      "system-ui",
      "Segoe UI",
      "PingFang SC",
      "Microsoft YaHei",
      "sans-serif",
    ],
  }),
  defineFont({
    id: "system.serif",
    label: "System Serif",
    fallbacks: ["Georgia", "Noto Serif SC", "Songti SC", "SimSun", "serif"],
  }),
  defineFont({
    id: "system.mono",
    label: "System Mono",
    fallbacks: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
  }),
] as const;
