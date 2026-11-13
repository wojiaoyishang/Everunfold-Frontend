import type { LanguageCatalog } from "@/core/i18n/catalog";
import type { PublicSnapshot } from "@/core/content/types";
import { unprefixedPath } from "@/core/i18n/locale";

export function glossarySlug(path: string, catalog: LanguageCatalog) {
  const match = /^\/glossary\/([^/]+)\/?$/.exec(unprefixedPath(path, catalog));
  if (!match) return undefined;
  try {
    const slug = decodeURIComponent(match[1]);
    if (slug && !/[\s/?#%<>\\]/.test(slug) && slug !== "." && slug !== "..")
      return slug;
  } catch {
    return undefined;
  }
}

export function glossaryTermPath(
  term: { slug: string; language: string },
  catalog: LanguageCatalog,
) {
  const language = term.language === "*" ? catalog.default_code : term.language;
  const route = catalog.languages.find(
    (item) => item.code === language && item.enabled,
  );
  return route
    ? `${route.prefix}/glossary/${encodeURIComponent(term.slug)}`
    : undefined;
}

export function publishedGlossaryTerm(
  snapshot: PublicSnapshot,
  slug: string,
  language: string,
) {
  return snapshot.glossary?.find(
    (term) =>
      term.slug === slug &&
      (term.language === language || term.language === "*"),
  );
}
