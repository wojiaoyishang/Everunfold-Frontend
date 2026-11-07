import type { FrontendPlugin } from "@everunfold/plugin-sdk";
import { gallery } from "./shortcode";

export default {
  id: "core.gallery",
  version: "1.0.0",
  title: "图片画廊",
  description: "原生画廊短代码与媒体选择",
  setup({ shortcodes }) {
    shortcodes.register(gallery);
  },
} satisfies FrontendPlugin;
