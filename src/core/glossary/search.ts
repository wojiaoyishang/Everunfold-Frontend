type SearchableTerm = {
  title: string;
  summary: string;
  aliases: string[];
};

export function filterGlossaryTerms<T extends SearchableTerm>(
  terms: readonly T[],
  query: string,
  limit = 20,
) {
  const needle = query.trim().normalize("NFKC").toLocaleLowerCase();
  if (!needle) return [];
  return terms
    .filter((term) =>
      [term.title, term.summary, ...term.aliases].some((value) =>
        value.normalize("NFKC").toLocaleLowerCase().includes(needle),
      ),
    )
    .slice(0, Math.max(0, limit));
}
