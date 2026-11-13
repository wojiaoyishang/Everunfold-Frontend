import { notFound } from "next/navigation";
import { readPageConfiguration } from "@/core/config/server";
import type { PublicSnapshot } from "@/core/content/types";
import { readPublicGlossaryTerm } from "@/core/glossary/server";
import { glossaryTermPath } from "@/core/glossary/routes";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { renderGlossaryContent } from "@/core/glossary/content";
import { resolveSeo, seoSite } from "@/core/seo/metadata";
import { canonicalPath, seoRouteFor, seoRoutes } from "@/core/seo/routes";
import { feedAlternates } from "@/core/seo/discovery";
import { StructuredData } from "@/core/seo/structured-data";
import { GlossaryDetailPage } from "@/themes/argon/glossary/detail";

async function readTerm(snapshot: PublicSnapshot, slug: string) {
  const catalog = normalizeCatalog(
    snapshot.site.settings?.site.language_catalog,
  );
  const locale = snapshot.site.locale ?? catalog.default_code;
  const result = await readPublicGlossaryTerm(slug, locale);
  if (result.status === "missing") notFound();
  if (result.status !== "ready") throw new Error("Glossary detail unavailable");
  const term = result.term;
  const path = glossaryTermPath(term, catalog);
  const language = term.language === "*" ? catalog.default_code : term.language;
  const routes = seoRoutes(snapshot);
  const route = seoRouteFor(routes, term.id, language);
  const origin = readPageConfiguration().publicSiteUrl;
  const seo = resolveSeo(
    {
      ...term,
      kind: "glossary",
      language,
      path,
      canonical: route && canonicalPath(route, routes),
      indexable: locale === language && route?.eligible !== false,
      summary: term.summary,
      cover: term.feature_image?.original,
    },
    seoSite(snapshot.site),
    origin,
  );
  if (seo.metadata.alternates)
    seo.metadata.alternates.types = feedAlternates(snapshot.site, origin);
  return { term, seo };
}

export async function glossaryTermMetadata(
  snapshot: PublicSnapshot,
  slug: string,
) {
  return (await readTerm(snapshot, slug)).seo.metadata;
}

export async function GlossaryTerm({
  snapshot,
  slug,
}: {
  snapshot: PublicSnapshot;
  slug: string;
}) {
  const { term, seo } = await readTerm(snapshot, slug);
  const rendered = renderGlossaryContent(
    term,
    snapshot.site.settings?.shortcodes,
  );
  return (
    <>
      <StructuredData data={seo.structured} />
      <GlossaryDetailPage
        id={term.id}
        title={term.title}
        summary={term.summary}
        aliases={term.aliases}
        featureImage={term.feature_image?.original}
        showImageViewer={term.show_image_viewer !== false}
        rendered={rendered}
        site={snapshot.site}
      />
    </>
  );
}
