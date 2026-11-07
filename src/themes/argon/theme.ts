import type { ThemeDefinition } from "@/core/extensions/types";

export default {
  id: "argon",
  version: "1.1.0",
  parent: null,
  components: [
    "public.shell",
    "public.header",
    "public.hero",
    "public.sidebar",
    "public.footer",
    "public.tools",
    "public.article.card",
    "public.article.header",
    "public.article.body",
    "public.post.card",
    "public.shuoshuo.card",
    "public.page.surface",
    "public.page.heading",
    "form.text",
    "form.textarea",
    "form.number",
    "form.boolean",
    "form.select",
    "form.object",
    "form.list",
  ],
} satisfies ThemeDefinition;
