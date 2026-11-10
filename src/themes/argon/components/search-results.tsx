import { UiText } from "@/core/i18n/provider";
import { messageLocale } from "@/core/i18n/locale";
import { translate } from "@/core/i18n/messages";
import { Button, TextField } from "@/themes/argon/components/ui/primitives";
import type { PublicSnapshot } from "@/core/content/types";
import { queryFeed, type SearchType } from "@/core/content/presentation";
import { PagePresentation } from "./route-state";
import { SearchContentType } from "./search-content-type";
import { SearchForm } from "./navigation-link";
import { ContentCard } from "./feed";
import { Pagination } from "./pagination";
import { EmptyState } from "./empty-state";
import { Icon } from "./icon";
import { SearchLanguages } from "./search-languages";
import { GlossarySearchResults } from "./glossary-search-results";

export function SearchResults({
  theme,
  snapshot,
  query,
  type,
  page,
  allLanguages = false,
  language,
}: {
  theme: string;
  snapshot: PublicSnapshot;
  query: string;
  type: SearchType;
  page: number;
  allLanguages?: boolean;
  language?: string;
}) {
  const uiLocale = messageLocale(snapshot.site.locale ?? "zh-CN");
  const glossaryOnly = type === "glossary";
  const result = glossaryOnly
    ? { items: [], total: 0, page: 1, pages: 0 }
    : queryFeed(snapshot, {
        query,
        type,
        page,
        includePages: true,
        allLanguages,
        language,
      });
  return (
    <>
      <PagePresentation site={snapshot.site} />
      <section className="surface search-card">
        <h1>
          <Icon name="search" />
          <UiText text="站内搜索" />
        </h1>
        <SearchForm className="search-form">
          <TextField
            name="q"
            aria-label="搜索关键词"
            placeholder={translate("搜索文章、说说、术语或页面…", uiLocale)}
            defaultValue={query}
            maxLength={160}
            autoFocus
          />
          <div className="search-filter-group">
            <SearchContentType key={type} defaultValue={type} />
            <SearchLanguages
              key={`${allLanguages}:${language ?? "current"}`}
              all={allLanguages}
              value={language}
            />
          </div>
          <Button className="primary-button" type="submit">
            <UiText text="搜索" />
          </Button>
        </SearchForm>
        <p>
          {query ? (
            glossaryOnly ? (
              <UiText text="“{query}”的术语匹配结果" values={{ query }} />
            ) : (
              <UiText
                text="“{query}” 找到 {count} 条内容"
                values={{ query, count: result.total }}
              />
            )
          ) : (
            <UiText text="在这里，寻找某一段故事。" />
          )}
        </p>
      </section>
      <GlossarySearchResults
        query={query}
        type={type}
        allLanguages={allLanguages}
        language={language}
      />
      {query && !glossaryOnly && (
        <>
          <div className="article-list">
            {result.items.length ? (
              result.items.map((entry) => (
                <ContentCard
                  key={entry.content.id}
                  entry={entry}
                  theme={theme}
                />
              ))
            ) : (
              <EmptyState
                title="没有找到相关内容"
                description="试试其他关键词或内容类型。"
              />
            )}
          </div>
          <Pagination
            page={result.page}
            pages={result.pages}
            pathname="/search"
            query={query}
            type={type}
            languages={allLanguages ? "all" : language}
          />
        </>
      )}
    </>
  );
}
