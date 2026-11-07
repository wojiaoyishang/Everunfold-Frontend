import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { UiText } from "@/core/i18n/provider";
import { useMemo } from "react";
import { renderContent } from "@/core/rendering/content";
import type { DraftFields, MediaURL } from "@/core/contracts/content-admin";
import { ContentMarkup } from "../../components/content-markup";
import type { PublicShortcode } from "@/core/contracts/settings";

export function DraftPreview({
  fields,
  media = {},
  shortcodes = [],
}: {
  fields: DraftFields;
  media?: Record<string, MediaURL>;
  shortcodes?: readonly PublicShortcode[];
}) {
  const runtime = usePluginRuntime();
  const rendered = useMemo(() => {
    // The render registry is replaced atomically when a runtime package changes.
    void runtime.catalog?.revision;
    return renderContent(
      {
        id: "draft-preview",
        content: fields.body.map((block) => ({
          ...block,
          type: block.type ?? "markdown",
        })),
        media_urls: media,
      },
      shortcodes,
    );
  }, [fields.body, media, shortcodes, runtime.catalog?.revision]);
  return (
    <article className="admin-draft-preview">
      {fields.title && <h1>{fields.title}</h1>}
      {fields.excerpt && (
        <p className="admin-draft-excerpt">{fields.excerpt}</p>
      )}
      {fields.body.some((block) => block.content.trim()) ? (
        <ContentMarkup html={rendered.html} features={rendered.features} />
      ) : (
        <p className="admin-draft-empty">
          <UiText text="写一点正文后，就能在这里预览。" />
        </p>
      )}
    </article>
  );
}
