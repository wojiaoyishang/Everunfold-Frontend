import "server-only";
import { renderContent } from "./content";
import { enhanceContentHtml } from "./features/content-features";

export async function renderContentForReader(
  content: Parameters<typeof renderContent>[0],
) {
  const rendered = renderContent(content);
  return {
    ...rendered,
    html:
      rendered.features.code || rendered.features.math
        ? await enhanceContentHtml(rendered.html)
        : rendered.html,
  };
}
