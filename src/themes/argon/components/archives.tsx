import { UiText } from "@/core/i18n/provider";
import { AppLink as Link } from "./navigation-link";
import type { PublicSnapshot } from "@/core/content/types";
import { displayDate, siteDateParts } from "@/core/content/query";
import { PagePresentation } from "./route-state";
import { Icon } from "./icon";
import { snapshotLocale } from "@/core/i18n/snapshot";
import { archiveArticles } from "@/core/content/archive";

export function Archives({ snapshot }: { snapshot: PublicSnapshot }) {
  const articles = archiveArticles(snapshot);
  const locale = snapshotLocale(snapshot);
  const reading = snapshot.site.settings?.site.reading;
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
  });
  const years = new Map<string, Map<string, typeof articles>>();
  for (const article of articles) {
    const { year, month } = siteDateParts(article.published_at, reading);
    const months = years.get(year) ?? new Map<string, typeof articles>();
    const group = months.get(month) ?? [];
    group.push(article);
    months.set(month, group);
    years.set(year, months);
  }
  return (
    <>
      <PagePresentation site={snapshot.site} />
      <header className="surface page-heading">
        <Icon name="archive" />
        <div>
          <h1>
            <UiText text="文章归档" />
          </h1>
          <p>
            {articles.length} <UiText text="篇文章" />
          </p>
        </div>
      </header>
      <div className="surface archive-card">
        {[...years].map(([year, months]) => (
          <section key={year} className="archive-year">
            <h2>{year}</h2>
            {[...months].map(([month, entries]) => (
              <section key={month} className="archive-month">
                <h3>
                  {monthLabel.format(
                    new Date(Date.UTC(2000, Number(month) - 1)),
                  )}
                  <small>{entries.length}</small>
                </h3>
                <ol>
                  {entries.map((article) => (
                    <li key={article.id}>
                      <time dateTime={article.published_at}>
                        {displayDate(
                          article.published_at,
                          false,
                          locale,
                          reading,
                        )}
                      </time>
                      <Link href={article.path} expectedContent>
                        {article.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </section>
        ))}
        {!articles.length && (
          <p>
            <UiText text="暂时还没有文章。" />
          </p>
        )}
      </div>
    </>
  );
}
