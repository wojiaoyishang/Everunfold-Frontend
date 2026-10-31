import type { Content, PublicSnapshot } from "./types";
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
