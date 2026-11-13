import { readConfiguration } from "@/core/config/server";
import { feedAlternates } from "@/core/seo/discovery";
import { readingPage } from "@/core/pages/reading-pages";
import { ManagedPageView } from "@/themes/argon/pages/view";
import { PagePresentation } from "@/themes/argon/components/route-state";
import { pageLanguages } from "@/core/pages/languages";
import { localizeHref } from "@/core/i18n/locale";
import { ServerThemeTemplate } from "@/core/extensions/server-components";
import { readActiveTheme } from "@/core/themes/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PublicSnapshot } from "@/core/content/types";
import { pageNumber, resolveTaxonomy } from "@/core/content/query";
import { feedType, searchType } from "@/core/content/presentation";
import { taxonomyHref } from "@/core/content/urls";
import { archiveRoute } from "@/core/content/archive";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { translate } from "@/core/i18n/messages";
import { UiText } from "@/core/i18n/provider";
import { Feed } from "@/themes/argon/components/feed";
import { SearchResults } from "@/themes/argon/components/search-results";
import { Archives } from "@/themes/argon/components/archives";
import { TaxonomyIndex } from "@/themes/argon/components/taxonomy-index";
import { ArticleList } from "@/themes/argon/components/article-list";
import { Icon } from "@/themes/argon/components/icon";

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
      "/gzrj": "高中日记",
      "/about": "关于网站",
      "/categories": "文章分类",
      "/tags": "文章标签",
      "/ss": "说说",
      "/article": "文章归档",
    } as Record<string, string>
  )[path];
  const origin = readConfiguration().publicSiteUrl;
  const catalog = normalizeCatalog(
    snapshot.site.settings?.site.language_catalog,
  );
  const locale = snapshot.site.locale ?? catalog.default_code;
  const assigned =
    path === "/"
      ? readingPage(snapshot, "home_page_id")
      : path === "/article"
        ? readingPage(snapshot, "posts_page_id")
        : undefined;
  const target = (language: string) =>
    path === "/article"
      ? (readingPage(snapshot, "posts_page_id", language)?.path ??
        localizeHref(path, language, catalog))
      : localizeHref(
          path === "/archives" ? archiveRoute(snapshot) : path,
          language,
          catalog,
        );
  return {
    ...(origin
      ? {
          alternates: {
            types: feedAlternates(snapshot.site, origin),
            canonical: new URL(target(locale), origin).href,
            languages: Object.fromEntries(
              catalog.languages
                .filter((item) => item.enabled)
                .map((item) => [
                  item.code,
                  new URL(target(item.code), origin).href,
                ]),
            ),
          },
        }
      : {}),
    ...(assigned
      ? { title: assigned.title, description: assigned.description }
      : title
        ? { title: translator(snapshot)(title) }
        : {}),
    ...(assigned?.allow_indexing === false
      ? { robots: { index: false, follow: true } }
      : {}),
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

export async function CodePage(props: CodePageProps) {
  const { snapshot, path, parameters = {} } = props;
  const theme = await readActiveTheme();
  const output = renderCodePage(props, theme);
  const query = parameters.q || parameters.s;
  const name =
    path === "/" && !query
      ? "home"
      : path === "/search" || path === "/"
        ? "search"
        : path === "/about"
          ? "page"
          : path === "/archives" ||
              path === "/gzrj" ||
              (path === "/article" && archiveRoute(snapshot) === path)
            ? "archives"
            : path === "/ss" || path === "/article"
              ? "feed"
              : "taxonomy";
  return (
    <ServerThemeTemplate
      theme={theme}
      name={name}
      context={{ site: snapshot.site, path }}
    >
      {output}
    </ServerThemeTemplate>
  );
}

function renderCodePage(
  {
    snapshot,
    path,
    parameters = {},
  }: {
    snapshot: PublicSnapshot;
    path: string;
    parameters?: PageParameters;
  },
  theme: string,
) {
  const page = pageNumber(parameters.page);
  const type =
    path === "/" || path === "/search"
      ? searchType(parameters.type)
      : feedType(parameters.type);
  const query =
    typeof parameters.q === "string"
      ? parameters.q
      : typeof parameters.s === "string"
        ? parameters.s
        : "";
  if (path === "/search" || (path === "/" && query))
    return (
      <SearchResults
        theme={theme}
        snapshot={snapshot}
        query={query.trim().slice(0, 160)}
        type={type}
        page={page}
        allLanguages={parameters.languages === "all"}
        language={
          typeof parameters.languages === "string" &&
          parameters.languages !== "all" &&
          parameters.languages !== "current"
            ? parameters.languages
            : undefined
        }
      />
    );
  const homepage =
    path === "/" ? readingPage(snapshot, "home_page_id") : undefined;
  if (homepage)
    return (
      <>
        <PagePresentation
          site={snapshot.site}
          id={`home:${homepage.id}:${homepage.revision}`}
        />
        <ManagedPageView
          page={homepage}
          translations={pageLanguages(snapshot, homepage)}
          comments={snapshot.comments[homepage.id] ?? []}
        />
      </>
    );
  const postsPage =
    path === "/article" ? readingPage(snapshot, "posts_page_id") : undefined;
  if (path === "/archives" || (path === "/article" && !postsPage))
    return <Archives snapshot={snapshot} />;
  if (path === "/gzrj") return <Archives snapshot={snapshot} diary />;
  if (path === "/about") {
    const { name, author, description } = snapshot.site;
    return (
      <>
        <PagePresentation site={snapshot.site} />
        <header className="surface page-heading">
          <Icon name="bell" />
          <div>
            <h1>
              <UiText text="关于网站" />
            </h1>
            <p>{name}</p>
          </div>
        </header>
        {(description || author) && (
          <div className="surface archive-card">
            {description && <p>{description}</p>}
            {author && (
              <p>
                <UiText text="作者" /> · {author}
              </p>
            )}
          </div>
        )}
      </>
    );
  }
  if (path === "/" || path === "/ss" || path === "/article")
    return (
      <Feed
        theme={theme}
        snapshot={snapshot}
        page={page}
        homepage={path === "/"}
        type={
          path === "/ss"
            ? "shuoshuo"
            : path === "/article"
              ? "article"
              : type === "glossary" || type === "page"
                ? "all"
                : type
        }
        pathname={postsPage?.path ?? path}
        heading={
          postsPage && {
            title: postsPage.title,
            description: postsPage.description,
          }
        }
      />
    );
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
