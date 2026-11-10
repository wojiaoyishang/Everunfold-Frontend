import type { ContentPresentation } from "@/core/contracts/presentation";
import type { Content, PublicSnapshot } from "./types";
import { normalizePath } from "./urls";
import { languageContents, snapshotLocale } from "@/core/i18n/snapshot";

export type { ContentPresentation };
export type ContentType = ContentPresentation["type"];
export type FeedType = ContentType | "all";
/** Origin is UI state, deliberately outside the business DTO. */
export interface FeedEntry {
  content: ContentPresentation;
  example: boolean;
}

export function presentLegacyContent({
  kind,
  ...content
}: Content): ContentPresentation {
  return {
    ...content,
    type: kind,
    comments_open: content.comments_open ?? true,
    reaction_count: 0,
    access: content.access ?? "public",
    opens_at: content.opens_at ?? null,
  };
}

export function publicFeed(snapshot: PublicSnapshot): FeedEntry[] {
  return languageContents(snapshot.contents, snapshotLocale(snapshot)).map(
    (content) => ({
      content: presentLegacyContent(content),
      example: false,
    }),
  );
}

export function resolvePresentation(snapshot: PublicSnapshot, path: string) {
  return snapshot.contents
    .map((content) => ({
      content: presentLegacyContent(content),
      example: false,
    }))
    .find(({ content }) => normalizePath(content.path) === normalizePath(path));
}

export function feedType(value: unknown): FeedType {
  return value === "article" || value === "shuoshuo" || value === "page"
    ? value
    : "all";
}

export function queryFeed(
  snapshot: PublicSnapshot,
  options: {
    query?: string;
    type?: FeedType;
    page?: number;
    pageSize?: number;
    includePages?: boolean;
    allLanguages?: boolean;
    language?: string;
  } = {},
) {
  const query = options.query?.trim().slice(0, 160).toLocaleLowerCase();
  const locale = snapshotLocale(snapshot);
  const candidates = (
    query
      ? snapshot.contents
          .filter(
            (item) =>
              options.allLanguages ||
              item.language === (options.language ?? locale),
          )
          .map((content) => ({
            content: presentLegacyContent(content),
            example: false,
          }))
      : publicFeed(snapshot)
  ).filter(({ content }) => {
    if (options.type && options.type !== "all" && content.type !== options.type)
      return false;
    if (!options.includePages && content.type === "page") return false;
    const text = [
      content.title,
      content.excerpt,
      ...content.content.map((block) => block.content),
      ...content.tags.map((tag) => tag.name),
      ...content.categories.map((category) => category.name),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return !query || text.includes(query);
  });
  const chosen = new Set(
    languageContents(
      candidates.map((item) => ({ ...item.content, kind: item.content.type })),
      locale,
    ).map((item) => item.id),
  );
  const items = candidates
    .filter((item) => chosen.has(item.content.id))
    .sort(
      (a, b) =>
        Number(b.content.pinned) - Number(a.content.pinned) ||
        Date.parse(b.content.published_at) -
          Date.parse(a.content.published_at) ||
        a.content.id.localeCompare(b.content.id),
    );
  const pageSize = Math.max(
    1,
    Math.min(
      100,
      Math.floor(Number.isFinite(options.pageSize) ? options.pageSize! : 10),
    ),
  );
  const page = Math.max(
    1,
    Math.floor(Number.isSafeInteger(options.page) ? options.page! : 1),
  );
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pages: Math.max(1, Math.ceil(items.length / pageSize)),
    total: items.length,
  };
}
