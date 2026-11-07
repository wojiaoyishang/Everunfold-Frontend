import type { ThemeViewContext } from "@/core/extensions/types";

/** Stable identities survive URL edits and language-specific paths. */
export function templateTargets(context: ThemeViewContext): string[] {
  if (context.page)
    return [
      `page:${context.page.id}`,
      ...(context.page.implementation_id
        ? [`page:${context.page.implementation_id}`]
        : []),
    ];
  return context.content ? [`content:${context.content.id}`] : [];
}
