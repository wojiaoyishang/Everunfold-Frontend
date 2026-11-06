import type { DraftDetail } from "@/core/contracts/content-admin";
import type { Content, Taxonomy } from "@/core/content/types";

const previewRoute =
  /^\/admin\/content\/(article|shuoshuo)\/([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})\/preview\/?$/i;

/** A private code route, never a published permalink or a bearer credential. */
export function contentPreviewPath(type: string, id: string) {
  const path = `/admin/content/${type}/${id}/preview`;
  if (!previewRoute.test(path))
    throw new Error("Invalid content preview route");
  return path;
}
export function isContentPreviewPath(path: string) {
  return previewRoute.test(path);
}

/** A display projection from the generated private DTO; never write it into a public store. */
export function previewContent(draft: DraftDetail, terms: Taxonomy[]): Content {
  if (!["article", "shuoshuo"].includes(draft.type_id))
    throw new Error("Unsupported content preview type");
  const settings = draft.settings;
  const media = draft.media_urls ?? {};
  const taxonomy = (names: string[], kind: Taxonomy["kind"]) =>
    names.map(
      (name) =>
        terms.find((term) => term.kind === kind && term.name === name) ?? {
          id: `preview:${kind}:${name}`,
          name,
          slug: name,
          kind,
          count: 0,
        },
    );
  // Match the current publication estimate, including block separators and Unicode code points.
  const length = Array.from(
    draft.body.map((block) => block.content).join("\n\n"),
  ).length;
  const cover = settings?.cover_media_id;
  return {
    id: draft.id,
    kind: draft.type_id as "article" | "shuoshuo",
    title: draft.title,
    path: settings?.path || draft.public_path || "",
    excerpt: draft.excerpt,
    language: draft.language ?? "zh-CN",
    translation_group_id: draft.translation_group_id,
    published_at:
      settings?.display_published_at || draft.published_at || draft.created_at,
    updated_at: draft.updated_at,
    author: draft.author,
    cover_url: cover ? (media[cover]?.original ?? null) : null,
    reading_minutes: Math.max(1, Math.ceil(length / 400)),
    word_count: length,
    categories: taxonomy(settings?.categories ?? [], "category"),
    tags: taxonomy(settings?.tags ?? [], "tag"),
    comment_count: 0,
    pinned: settings?.pinned ?? false,
    content: draft.body.map((block) => ({
      ...block,
      type: block.type ?? "markdown",
    })),
    media_urls: media,
    comments_open: settings?.comments_open ?? true,
    access: settings?.opens_at
      ? "scheduled"
      : settings?.visibility === "password"
        ? "password"
        : "public",
    opens_at: settings?.opens_at ?? null,
  };
}
