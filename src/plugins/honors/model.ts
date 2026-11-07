export interface Honor {
  id: string;
  title: string;
  category: string;
  date: string;
  dateKey: number | null;
  year: string;
  award: string;
  description: string;
  image: string | null;
  link: string | null;
}
export type HonorOrder = "manual" | "newest" | "oldest";
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown, limit: number) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

/** No executable schemes, credentials, protocol-relative URLs or backslash redirects. */
export function honorUrl(value: unknown): string | null {
  const source = text(value, 2048);
  if (!source || /[\u0000-\u0020\\]/.test(source)) return null;
  if (source.startsWith("/") && !source.startsWith("//")) return source;
  try {
    const url = new URL(source);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Dates may have year/month precision. Never invent a day or rely on browser date parsing. */
function honorDate(value: string): { key: number | null; year: string } {
  const match = /^(\d{4})(?:[.\/-](\d{1,2})(?:[.\/-](\d{1,2}))?)?$/.exec(value);
  if (!match) return { key: null, year: "" };
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : 0;
  const day = match[3] ? Number(match[3]) : 0;
  if (
    year < 1 ||
    (match[2] && (month < 1 || month > 12)) ||
    (match[3] &&
      (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()))
  )
    return { key: null, year: "" };
  return { key: year * 10000 + month * 100 + day, year: match[1] };
}

export function readHonors(value: unknown) {
  const options = record(value);
  const items = (Array.isArray(options.honors) ? options.honors : [])
    .slice(0, 300)
    .flatMap((value, index): Honor[] => {
      const item = record(value);
      const title = text(item.title, 200);
      if (!title) return [];
      const date = text(item.date, 32);
      const parsed = honorDate(date);
      return [
        {
          id: `${text(item.id, 100) || "item"}:${index}`,
          title,
          category: text(item.category, 80),
          date,
          dateKey: parsed.key,
          year: parsed.year,
          award: text(item.award, 200),
          description: text(item.description, 3000),
          image: honorUrl(item.image_url),
          link: honorUrl(item.link_url),
        },
      ];
    });
  return {
    intro: text(options.intro, 2000),
    layout: options.layout === "timeline" ? "timeline" : "grid",
    sort:
      options.sort === "newest" || options.sort === "oldest"
        ? options.sort
        : ("manual" as HonorOrder),
    search: options.search_enabled !== false,
    yearFilter: options.year_filter !== false,
    summary: options.show_summary !== false,
    items,
    categories: [...new Set(items.map((item) => item.category))],
    years: [...new Set(items.map((item) => item.year).filter(Boolean))]
      .sort()
      .reverse(),
  };
}

export function filterHonors(
  items: readonly Honor[],
  {
    category = null,
    year = "",
    query = "",
    order = "manual",
  }: {
    category?: string | null;
    year?: string;
    query?: string;
    order?: HonorOrder;
  },
) {
  const needle = query.trim().toLocaleLowerCase();
  const filtered = items.filter(
    (item) =>
      (category === null || item.category === category) &&
      (!year || item.year === year) &&
      (!needle ||
        `${item.title} ${item.award} ${item.category} ${item.date} ${item.description}`
          .toLocaleLowerCase()
          .includes(needle)),
  );
  if (order !== "manual")
    filtered.sort((a, b) => {
      if (a.dateKey === null) return b.dateKey === null ? 0 : 1;
      if (b.dateKey === null) return -1;
      return order === "newest" ? b.dateKey - a.dateKey : a.dateKey - b.dateKey;
    });
  return filtered;
}
