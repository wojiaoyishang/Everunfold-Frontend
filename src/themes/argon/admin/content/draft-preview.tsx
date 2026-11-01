import { useMemo } from "react";
import { renderContent } from "@/core/rendering/content";
import type { DraftFields } from "@/generated/content-admin-contract";

export function DraftPreview({ fields }: { fields: DraftFields }) {
  const html = useMemo(
    () =>
      renderContent({
        id: "draft-preview",
        content: fields.body.map((block) => ({
          ...block,
          type: "markdown" as const,
        })),
        media_urls: {},
      }).html,
    [fields.body],
  );
  return (
    <article className="admin-draft-preview">
      {fields.title && <h1>{fields.title}</h1>}
      {fields.excerpt && (
        <p className="admin-draft-excerpt">{fields.excerpt}</p>
      )}
      {fields.body.some((block) => block.content.trim()) ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="admin-draft-empty">写一点正文后，就能在这里预览。</p>
      )}
    </article>
  );
}
