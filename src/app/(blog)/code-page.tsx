import { readConfiguration } from "@/core/config/server";
import { feedAlternates } from "@/core/seo/discovery";
import { localizeHref } from "@/core/i18n/locale";
import { ThemeTemplate } from "@/core/themes/presentation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PublicSnapshot } from "@/core/content/types";
import { pageNumber, resolveTaxonomy } from "@/core/content/query";
import { feedType } from "@/core/content/presentation";
import { taxonomyHref } from "@/core/content/urls";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { translate } from "@/core/i18n/messages";
import { Feed } from "@/themes/argon/components/feed";
import { SearchResults } from "@/themes/argon/components/search-results";
import { Archives } from "@/themes/argon/components/archives";
import { TaxonomyIndex } from "@/themes/argon/components/taxonomy-index";
import { ArticleList } from "@/themes/argon/components/article-list";

export type PageParameters = Record<string, string | string[] | undefined>;
function translator(snapshot: PublicSnapshot) {
  const catalog = normalizeCatalog(
    snapshot.site.settings?.site.language_catalog,
  );
  const language =
    catalog.languages.find((item) => item.code === snapshot.site.locale) ??
    catalog.languages.find((item) => item.code === catalog.default_code)!;
  return (source: string) => translate(source, language.ui_locale);
}
export function codePageMetadata(
  snapshot: PublicSnapshot,
  path: string,
): Metadata {
  const title = (
    {
      "/search": "站内搜索",
      "/archives": "文章归档",
      "/categories": "文章分类",
      "/tags": "文章标签",
      "/ss": "说说",
      "/article": "文章",
    } as Record<string, string>
  )[path];
  const origin = readConfiguration().publicSiteUrl;
  const catalog = normalizeCatalog(
    snapshot.site.settings?.site.language_catalog,
  );
  const locale = snapshot.site.locale ?? catalog.default_code;
  return {
    ...(origin
      ? {
          alternates: {
            types: feedAlternates(snapshot.site, origin),
            canonical: new URL(localizeHref(path, locale, catalog), origin)
              .href,
            languages: Object.fromEntries(
              catalog.languages
                .filter((item) => item.enabled)
                .map((item) => [
                  item.code,
                  new URL(localizeHref(path, item.code, catalog), origin).href,
                ]),
            ),
          },
        }
      : {}),
    ...(title ? { title: translator(snapshot)(title) } : {}),
    ...(path === "/search" || path === "/ss"
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}
type CodePageProps = {
  snapshot: PublicSnapshot;
  path: string;
  parameters?: PageParameters;
};

export function CodePage(props: CodePageProps) {
  const { snapshot, path, parameters = {} } = props;
  const output = renderCodePage(props);
  const query = parameters.q || parameters.s;
  const name =
    path === "/" && !query
      ? "home"
      : path === "/search" || path === "/"
        ? "search"
        : path === "/archives"
          ? "archives"
          : path === "/ss" || path === "/article"
            ? "feed"
            : "taxonomy";
  return (
    <ThemeTemplate name={name} context={{ site: snapshot.site, path }}>
      {output}
    </ThemeTemplate>
  );
}

function renderCodePage({
  snapshot,
  path,
  parameters = {},
}: {
  snapshot: PublicSnapshot;
  path: string;
  parameters?: PageParameters;
}) {
  const page = pageNumber(parameters.page),
    type = feedType(parameters.type);
  const query =
    typeof parameters.q === "string"
      ? parameters.q
      : typeof parameters.s === "string"
        ? parameters.s
        : "";
  if (path === "/search" || (path === "/" && query))
    return (
      <SearchResults
        snapshot={snapshot}
        query={query.trim().slice(0, 160)}
        type={type}
        page={page}
        allLanguages={parameters.languages === "all"}
      />
    );
  if (path === "/" || path === "/ss" || path === "/article")
    return (
      <Feed
        snapshot={snapshot}
        page={page}
        type={
          path === "/ss"
            ? "shuoshuo"
            : path === "/article"
              ? "article"
              : type === "page"
                ? "all"
                : type
        }
        pathname={path}
      />
    );
  if (path === "/archives") return <Archives snapshot={snapshot} />;
  if (path === "/categories" || path === "/tags")
    return (
      <TaxonomyIndex
        snapshot={snapshot}
        kind={path === "/categories" ? "category" : "tag"}
      />
    );
  const taxonomy = /^\/(category|tag)\/([^/]+)$/.exec(path);
  if (taxonomy) {
    const kind = taxonomy[1] as "category" | "tag",
      term = resolveTaxonomy(snapshot, kind, taxonomy[2]);
    if (!term) notFound();
    const t = translator(snapshot);
    return (
      <ArticleList
        snapshot={snapshot}
        title={kind === "tag" ? `# ${term.name}` : term.name}
        subtitle={`${t(kind === "tag" ? "标签" : "分类")} · ${term.count} ${t("篇文章")}`}
        icon={kind === "tag" ? "tag" : "folder"}
        pathname={taxonomyHref(term)}
        filter={{ [kind]: term.slug, page }}
      />
    );
  }
  notFound();
}
