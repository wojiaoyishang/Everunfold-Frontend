import type { Content, PublicSnapshot } from "@/core/content/types";
import { relatedArticles } from "@/core/content/related";
import { AppLink } from "./navigation-link";
import { Icon } from "./icon";
import { StoryCover } from "./story-cover";
export function RelatedArticles({
  snapshot,
  content,
}: {
  snapshot: PublicSnapshot;
  content: Content;
}) {
  const items = relatedArticles(snapshot, content, 6);
  if (!items.length) return null;
  return (
    <section
      className="surface related-articles"
      aria-labelledby="related-title"
    >
      <h2 id="related-title">
        <Icon name="book" />
        推荐文章
      </h2>
      <ul className="related-track">
        {items.map((entry) => (
          <li key={entry.id}>
            <AppLink href={entry.path} className="related-card">
              <StoryCover src={entry.cover_url} sizes="220px" />
              <h3>{entry.title}</h3>
              <Icon name="chevron" className="related-arrow" />
            </AppLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
