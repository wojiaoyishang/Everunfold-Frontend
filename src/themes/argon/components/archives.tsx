import { AppLink as Link } from "./navigation-link";
import type { PublicSnapshot } from "@/core/content/types";
import { displayDate } from "@/core/content/query";
import { PagePresentation } from "./route-state";
import { Icon } from "./icon";

export function Archives({ snapshot }: { snapshot: PublicSnapshot }) {
  const articles = snapshot.contents
    .filter((entry) => entry.kind === "article")
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  const groups = new Map<string, typeof articles>();
  for (const article of articles) {
    const month = displayDate(article.published_at).slice(0, 7);
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
          <h1>文章归档</h1>
          <p>共 {articles.length} 篇文章，记录一路走来的故事。</p>
        </div>
      </header>
      <section className="surface archive-card">
        {[...groups.entries()].map(([month, entries]) => (
          <section key={month} className="archive-month">
            <h2>
              {month.replace("/", " 年 ")} 月 <small>{entries.length}</small>
            </h2>
            <ol>
              {entries.map((article) => (
                <li key={article.id}>
                  <time dateTime={article.published_at}>
                    {displayDate(article.published_at).slice(5)}
                  </time>
                  <Link href={article.path}>{article.title}</Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
        {!articles.length && <p>暂时还没有文章。</p>}
      </section>
    </>
  );
}
