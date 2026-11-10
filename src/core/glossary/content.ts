import type { Content } from "@/core/content/types";
import { renderContent } from "@/core/rendering/content";
import type { PublicShortcode } from "@/core/contracts/settings";

type GlossaryBlock = {
  id: string;
  type?: "markdown" | "html";
  content: string;
};

export type GlossaryRenderable = {
  id: string;
  summary: string;
  body: readonly GlossaryBlock[];
  media_urls?: Content["media_urls"];
};

export function renderGlossaryContent(
  term: GlossaryRenderable,
  shortcodes: readonly PublicShortcode[] = [],
) {
  return renderContent(
    {
      id: term.id,
      content: term.body.some((block) => block.content.trim())
        ? term.body.map((block) => ({
            ...block,
            type: block.type ?? "markdown",
          }))
        : [
            {
              id: `${term.id}-summary`,
              type: "markdown",
              content: term.summary,
            },
          ],
      media_urls: term.media_urls ?? {},
    },
    shortcodes,
  );
}
