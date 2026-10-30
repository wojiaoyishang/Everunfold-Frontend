import type { Content, PublicSnapshot } from "./types";
import { normalizePath } from "./urls";

export interface ContentFilter {
  query?: string;
  category?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export function queryContents(
  snapshot: PublicSnapshot,
  filter: ContentFilter = {},
) {
  const query = filter.query?.trim().slice(0, 160).toLocaleLowerCase();
  const all = snapshot.contents
    .filter((item) => {
      if (item.kind !== "article") return false;
      if (
        filter.category &&
        !item.categories.some((category) => category.slug === filter.category)
      )
        return false;
      if (filter.tag && !item.tags.some((tag) => tag.slug === filter.tag))
        return false;
      if (query) {
        const searchable =
          `${item.title} ${item.excerpt} ${item.categories.map((term) => term.name).join(" ")} ${item.tags.map((term) => term.name).join(" ")} ${item.content.map((block) => block.content).join(" ")}`.toLocaleLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        Date.parse(b.published_at) - Date.parse(a.published_at) ||
        a.id.localeCompare(b.id),
    );
  const pageSize = Math.max(1, Math.min(filter.pageSize ?? 10, 100));
  const page = Math.max(1, filter.page ?? 1);
  return {
    items: all.slice((page - 1) * pageSize, page * pageSize),
    total: all.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(all.length / pageSize)),
  };
}

export function resolveContent(
  snapshot: PublicSnapshot,
  requestedPath: string,
): Content | undefined {
  const requested = normalizePath(requestedPath);
  return snapshot.contents.find(
    (item) => normalizePath(item.path) === requested,
  );
}

export function pageNumber(value: string | string[] | undefined): number {
  return typeof value === "string" &&
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value))
    ? Math.max(1, Number(value))
    : 1;
}

export function displayDate(value: string, detailed = false): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(detailed ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(new Date(value));
}
