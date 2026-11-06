import type { ThemeDefinition } from "@/core/extensions/types";

export default {
  id: "argon",
  version: "1.0.0",
  components: [
    "form.text",
    "form.textarea",
    "form.number",
    "form.boolean",
    "form.select",
    "form.object",
    "form.list",
  ],
} satisfies ThemeDefinition;
