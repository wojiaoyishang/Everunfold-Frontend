import type { ContentMetadata } from "@/core/content/types";
import type { ArticleDisplayPreferences } from "@/core/contracts/settings";

export function articleDisplay(
  content: ContentMetadata,
  theme?: ArticleDisplayPreferences,
): ArticleDisplayPreferences {
  return {
    ...theme,
    show_share: content.show_share ?? theme?.show_share,
    show_toc: content.show_toc ?? theme?.show_toc,
    show_related: content.show_related ?? theme?.show_related,
  };
}

export function readingMinutes(
  html: string,
  display?: ArticleDisplayPreferences,
) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:#[\w]+|[a-z]+);/gi, " ");
  const han = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  const words =
    text
      .replace(/\p{Script=Han}/gu, " ")
      .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return Math.max(
    1,
    Math.ceil(
      han / (display?.han_per_minute ?? 400) +
        words / (display?.words_per_minute ?? 200),
    ),
  );
}

export function ArticleAfterword({
  content,
  display,
}: {
  content: ContentMetadata;
  display?: ArticleDisplayPreferences;
}) {
  const text = display?.afterword?.trim();
  return text && content.show_afterword !== false ? (
    <aside className="article-afterword">{text}</aside>
  ) : null;
}
