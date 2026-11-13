import type { PublicManagedPage } from "@/core/contracts/pages";
import type { Content, PublicSnapshot, Taxonomy } from "@/core/content/types";
import { languageContents } from "@/core/i18n/snapshot";

export type PageArticle = Pick<
  Content,
  | "id"
  | "path"
  | "title"
  | "language"
  | "published_at"
  | "translation_group_id"
  | "translations"
> & {
  categories: Pick<Taxonomy, "id" | "name">[];
  tags: Pick<Taxonomy, "id" | "slug" | "name">[];
};

export type PageArticleCollection = {
  items: PageArticle[];
  categoryName: string;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  from?: string;
  to?: string;
};

export type PageArticleData = {
  collection?: PageArticleCollection;
  sources?: readonly PageArticle[];
};

export function pageArticleSources(
  snapshot: PublicSnapshot,
  category?: string,
) {
  return snapshot.contents
    .filter(
      (item) =>
        item.kind === "article" &&
        (!item.access || item.access === "public") &&
        (!category || item.categories.some((term) => term.id === category)),
    )
    .map(
      ({
        id,
        title,
        path,
        published_at,
        language,
        translation_group_id,
        translations,
        categories,
        tags,
      }): PageArticle => ({
        id,
        title,
        path,
        published_at,
        language,
        translation_group_id,
        translations: translations?.filter(
          (entry) => entry.id === id && entry.is_original,
        ),
        categories: categories.map(({ id, name }) => ({ id, name })),
        tags: tags.map(({ id, slug, name }) => ({ id, slug, name })),
      }),
    );
}

export function pageArticleCategory(page: PublicManagedPage, option: string) {
  const value = page.options?.[option];
  return typeof value === "string" &&
    /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
    ? value.toLowerCase()
    : undefined;
}

export function pageArticleCollection(
  source: readonly PageArticle[],
  category: string | undefined,
  locale: string,
  page: number,
  pageSize: number,
): PageArticleCollection {
  const articles = languageContents(
    category
      ? source.filter((item) =>
          item.categories.some((term) => term.id === category),
        )
      : [],
    locale,
  ).sort(
    (a, b) =>
      Date.parse(b.published_at) - Date.parse(a.published_at) ||
      a.id.localeCompare(b.id),
  );
  const pages = Math.max(1, Math.ceil(articles.length / pageSize));
  const current = Math.min(page, pages);
  return {
    items: articles.slice((current - 1) * pageSize, current * pageSize),
    categoryName:
      articles[0]?.categories.find((term) => term.id === category)?.name ?? "",
    total: articles.length,
    page: current,
    pages,
    pageSize,
    from: articles.at(-1)?.published_at,
    to: articles[0]?.published_at,
  };
}
