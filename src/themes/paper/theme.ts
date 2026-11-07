import type { ThemeDefinition } from "@/core/extensions/types";

/** A CSS-only starting point: inherit Argon's components, templates and hooks. */
export default {
  id: "paper",
  version: "2.0.0",
  parent: "argon",
  styles: true,
} satisfies ThemeDefinition;
