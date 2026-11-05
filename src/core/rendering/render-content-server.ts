import "server-only";
import { renderContent } from "./content";
import { enhanceContentHtml } from "./features/content-features";
import { readAppliedSettings } from "@/server/settings/current";

export async function renderContentForReader(
  content: Parameters<typeof renderContent>[0],
) {
  const settings = await readAppliedSettings();
  const rendered = renderContent(content, settings.publicSettings?.shortcodes);
  return {
    ...rendered,
    html:
      rendered.features.code || rendered.features.math
        ? await enhanceContentHtml(rendered.html)
        : rendered.html,
  };
}
