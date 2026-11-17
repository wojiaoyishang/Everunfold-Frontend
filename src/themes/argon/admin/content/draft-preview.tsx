import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { UiText } from "@/core/i18n/provider";
import { useMemo } from "react";
import { renderContent } from "@/core/rendering/content";
import type { DraftFields, MediaURL } from "@/core/contracts/content-admin";
import { ContentMarkup } from "../../components/content-markup";
import type { RenderShortcodes } from "@/core/shortcodes/configuration";

export function DraftPreview({
  fields,
  media = {},
  shortcodes = [],
}: {
  fields: DraftFields;
  media?: Record<string, MediaURL>;
  shortcodes?: RenderShortcodes;
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
      { videoPreview: true },
    );
  }, [fields.body, media, shortcodes, runtime.catalog?.revision]);
  const issue = rendered.diagnostics[0];
  return (
    <article className="admin-draft-preview">
      {fields.title && <h1>{fields.title}</h1>}
      {fields.excerpt && (
        <p className="admin-draft-excerpt">{fields.excerpt}</p>
      )}
      {issue && (
        <p role="status" className="admin-draft-empty">
          <UiText
            text="正文块 {block} 第 {line} 行 · {message}"
            values={{
              block: issue.block + 1,
              line: fields.body[issue.block].content
                .slice(0, issue.from)
                .split(/\r\n?|\n/).length,
              message: issue.message,
            }}
          />
        </p>
      )}
      {fields.body.some((block) => block.content.trim()) ? (
        <ContentMarkup
          className="article-content"
          html={rendered.html}
          features={rendered.features}
          shortcodes={shortcodes}
        />
      ) : (
        <p className="admin-draft-empty">
          <UiText text="写一点正文后，就能在这里预览。" />
        </p>
      )}
    </article>
  );
}
