import type { ThemeDefinition } from "@/core/extensions/types";

export default {
  id: "paper",
  version: "1.0.0",
  parent: "argon",
  components: ["public.hero", "paper.people", "paper.footer-note"],
  templates: { "page:core.people": "paper.people" },
  slots: { "shell.footer.after": ["paper.footer-note"] },
  styles: true,
} satisfies ThemeDefinition;
