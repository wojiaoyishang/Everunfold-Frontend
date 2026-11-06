import type { FrontendPlugin } from "@/core/plugins/types";
import people from "./page";

export default {
  id: "core.people",
  version: "1.0.0",
  setup({ pages, components }) {
    pages.register(people);
    components.register("core.people.page");
    components.register("core.people.message");
  },
} satisfies FrontendPlugin;
