import type { FrontendPlugin } from "@/core/plugins/types";
import { gallery } from "./shortcode";

export default {
  id: "core.gallery",
  version: "1.0.0",
  setup({ shortcodes }) {
    shortcodes.register(gallery);
  },
} satisfies FrontendPlugin;
