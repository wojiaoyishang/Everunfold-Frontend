import type { DraftQuery } from "@/core/contracts/content-admin";
export type CatalogFilters = Pick<
  DraftQuery,
  | "status"
  | "language"
  | "author_id"
  | "category"
  | "tag"
  | "updated_from"
  | "updated_to"
  | "order_by"
  | "direction"
>;
export const defaultFilters: CatalogFilters = {
  status: "all",
  language: null,
  order_by: "updated_at",
  direction: "desc",
};
const statuses = ["all", "draft", "published", "scheduled", "failed", "trash"];
export function parseCatalogQuery(source: string) {
  const p = new URLSearchParams(source);
  const date = (key: string) => {
    const value = p.get(key);
    return value && Number.isFinite(Date.parse(value))
      ? new Date(value).toISOString()
      : null;
  };
  const author = p.get("author_id");
  return {
    search: (p.get("search") ?? "").slice(0, 200),
    page: Math.max(1, Math.min(100000, Math.floor(Number(p.get("page"))) || 1)),
    filters: {
      status: statuses.includes(p.get("status") ?? "")
        ? (p.get("status") as CatalogFilters["status"])
        : "all",
      language: p.get("language") || null,
      author_id:
        author && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(author)
          ? author
          : null,
      category: (p.get("category") ?? "").slice(0, 60) || null,
      tag: (p.get("tag") ?? "").slice(0, 60) || null,
      updated_from: date("updated_from"),
      updated_to: date("updated_to"),
      order_by: ["updated_at", "created_at", "published_at", "title"].includes(
        p.get("order_by") ?? "",
      )
        ? (p.get("order_by") as CatalogFilters["order_by"])
        : "updated_at",
      direction: p.get("direction") === "asc" ? "asc" : "desc",
    } satisfies CatalogFilters,
  };
}
export function catalogQuery(
  filters: CatalogFilters,
  search: string,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({
    ...filters,
    search,
    page: page > 1 ? page : null,
  })) {
    if (value && value !== defaultFilters[key as keyof CatalogFilters])
      params.set(key, String(value));
  }
  return params.toString();
}
