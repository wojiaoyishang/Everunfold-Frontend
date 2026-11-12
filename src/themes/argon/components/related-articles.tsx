import { UiText } from "@/core/i18n/provider";
import type { Content, PublicSnapshot } from "@/core/content/types";
import { relatedArticles } from "@/core/content/related";
import { AppLink } from "./navigation-link";
import { Icon } from "./icon";
import { StoryCover } from "./story-cover";
import { HorizontalRail } from "./ui/horizontal-rail";
export function RelatedArticles({
  snapshot,
  content,
  limit = 6,
  basis,
}: {
  snapshot: PublicSnapshot;
  content: Content;
  limit?: number;
  basis?: Parameters<typeof relatedArticles>[3];
}) {
  if (limit <= 0) return null;
  const items = relatedArticles(snapshot, content, limit, basis);
  if (!items.length) return null;
  return (
    <section
      className="surface related-articles"
      aria-labelledby="related-title"
    >
      <h2 id="related-title">
        <Icon name="book" />
        <UiText text="推荐文章" />
      </h2>
      <HorizontalRail className="related-track" aria-label="推荐文章列表">
        {items.map((entry) => (
          <li key={entry.id}>
            <AppLink href={entry.path} expectedContent className="related-card">
              <StoryCover src={entry.cover_url} sizes="220px" />
              <h3>{entry.title}</h3>
              <Icon name="chevron" className="related-arrow" />
            </AppLink>
          </li>
        ))}
      </HorizontalRail>
    </section>
  );
}
