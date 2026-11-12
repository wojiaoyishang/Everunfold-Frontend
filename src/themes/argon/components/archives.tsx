import { UiText } from "@/core/i18n/provider";
import { AppLink as Link } from "./navigation-link";
import type { PublicSnapshot } from "@/core/content/types";
import { displayDate, siteDateParts } from "@/core/content/query";
import { PagePresentation } from "./route-state";
import { Icon } from "./icon";
import { languageContents, snapshotLocale } from "@/core/i18n/snapshot";

export function Archives({ snapshot }: { snapshot: PublicSnapshot }) {
  const articles = languageContents(snapshot.contents, snapshotLocale(snapshot))
    .filter((entry) => entry.kind === "article")
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  const reading = snapshot.site.settings?.site.reading;
  const groups = new Map<string, typeof articles>();
  for (const article of articles) {
    const { year, month: number } = siteDateParts(
      article.published_at,
      reading,
    );
    const month = `${year}/${number}`;
    const group = groups.get(month) ?? [];
    group.push(article);
    groups.set(month, group);
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
            <UiText text="共" />
            {articles.length} <UiText text="篇文章，记录一路走来的故事。" />
          </p>
        </div>
      </header>
      <section className="surface archive-card">
        {[...groups.entries()].map(([month, entries]) => (
          <section key={month} className="archive-month">
            <h2>
              {month.replace("/", " 年 ")} <UiText text="月" />
              <small>{entries.length}</small>
            </h2>
            <ol>
              {entries.map((article) => (
                <li key={article.id}>
                  <time dateTime={article.published_at}>
                    {displayDate(
                      article.published_at,
                      false,
                      snapshotLocale(snapshot),
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
        {!articles.length && (
          <p>
            <UiText text="暂时还没有文章。" />
          </p>
        )}
      </section>
    </>
  );
}
