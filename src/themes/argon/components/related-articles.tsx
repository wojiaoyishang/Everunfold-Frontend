import Image from "next/image";
import type { Content, PublicSnapshot } from "@/core/content/types";
import { relatedArticles } from "@/core/content/related";
import { displayDate } from "@/core/content/query";
import { AppLink } from "./navigation-link";
import { Icon } from "./icon";
export function RelatedArticles({
  snapshot,
  content,
}: {
  snapshot: PublicSnapshot;
  content: Content;
}) {
  const items = relatedArticles(snapshot, content);
  if (!items.length) return null;
  return (
    <section
      className="surface related-articles"
      aria-labelledby="related-title"
    >
      <h2 id="related-title">
        <Icon name="leaf" />
        也许，你还想看看
      </h2>
      <div>
        {items.map((entry) => (
          <AppLink key={entry.id} href={entry.path} className="related-card">
            <div className="related-cover">
              {entry.cover_url ? (
                <Image
                  src={entry.cover_url}
                  alt=""
                  width={360}
                  height={180}
                  unoptimized
                />
              ) : (
                <Icon name="campfire" />
              )}
            </div>
            <div>
              <time dateTime={entry.published_at}>
                {displayDate(entry.published_at)}
              </time>
              <h3>{entry.title}</h3>
            </div>
          </AppLink>
        ))}
      </div>
    </section>
  );
}
