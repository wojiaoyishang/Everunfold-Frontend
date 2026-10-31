import type { Content, PublicSnapshot } from "./types";

/** Chronological neighbors, independent of pinned status and the current feed filter. */
export function articleNeighbors(snapshot: PublicSnapshot, current: Content) {
  const articles = snapshot.contents
    .filter((entry) => entry.kind === "article")
    .sort(
      (a, b) =>
        Date.parse(b.published_at) - Date.parse(a.published_at) ||
        a.id.localeCompare(b.id),
    );
  const position =
    current.kind === "article"
      ? articles.findIndex((entry) => entry.id === current.id)
      : -1;
  return {
    previous: position >= 0 ? articles[position + 1] : undefined,
    next: position > 0 ? articles[position - 1] : undefined,
  };
}

/** Related public articles only; visitors and private state never enter this ranking. */
export function relatedArticles(
  snapshot: PublicSnapshot,
  current: Content,
  limit = 3,
) {
  const tags = new Set(current.tags.map((term) => term.id));
  const categories = new Set(current.categories.map((term) => term.id));
  const score = (entry: Content) =>
    entry.tags.filter((term) => tags.has(term.id)).length * 3 +
    entry.categories.filter((term) => categories.has(term.id)).length;
  return snapshot.contents
    .filter((entry) => entry.kind === "article" && entry.id !== current.id)
    .map((entry) => ({ entry, score: score(entry) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.entry.published_at) - Date.parse(a.entry.published_at) ||
        a.entry.id.localeCompare(b.entry.id),
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
}
