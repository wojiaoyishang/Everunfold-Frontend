import type { Content } from "@/core/content/types";
import { renderContent } from "@/core/rendering/content";
import type { RenderShortcodes } from "@/core/shortcodes/configuration";

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

function renderableBlocks(term: GlossaryRenderable) {
  return term.body.map((block) => ({
    ...block,
    type: block.type ?? "markdown",
  }));
}

export function renderGlossaryContent(
  term: GlossaryRenderable,
  shortcodes: RenderShortcodes = [],
) {
  return renderContent(
    {
      id: term.id,
      content: term.body.some((block) => block.content.trim())
        ? renderableBlocks(term)
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

export function renderGlossaryPreview(
  term: GlossaryRenderable,
  shortcodes: RenderShortcodes = [],
) {
  const first = renderableBlocks(term).find((block) => block.content.trim());
  if (!first) return null;
  return renderContent(
    {
      id: term.id,
      content: [first],
      media_urls: term.media_urls ?? {},
    },
    shortcodes,
  );
}
