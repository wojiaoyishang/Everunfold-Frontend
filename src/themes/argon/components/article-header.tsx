import Image from "next/image";
import type { ContentMetadata } from "@/core/content/types";
import { resourceUrl, taxonomyHref } from "@/core/content/urls";
import { AppLink as Link } from "./navigation-link";
import { PostMeta } from "./post-meta";
import { ContentLanguages } from "./content-languages";
import type { ArticleDisplayPreferences } from "@/core/contracts/settings";

export function ArticleHeader({
  content,
  liveMetrics = true,
  interactive = true,
  display,
  minutes,
}: {
  content: ContentMetadata;
  liveMetrics?: boolean;
  interactive?: boolean;
  display?: ArticleDisplayPreferences;
  minutes?: number;
}) {
  const cover =
    display?.cover_position === "hidden"
      ? null
      : resourceUrl(content.cover_url);
  const below = display?.cover_position === "below";
  const image = cover && (
    <div
      className={below ? "article-cover-inline" : "article-cover"}
      aria-hidden="true"
    >
      <Image
        src={cover}
        alt=""
        fill
        sizes="(max-width: 900px) 100vw, 900px"
        unoptimized
        preload
      />
    </div>
  );
  return (
    <header className={`article-header${cover && !below ? " has-cover" : ""}`}>
      {!below && image}
      <div className="article-heading">
        <div className="article-categories">
          {content.categories.map((category) => (
            <Link key={category.id} href={taxonomyHref(category)}>
              {category.name}
            </Link>
          ))}
        </div>
        <h1>{content.title}</h1>
        <PostMeta
          content={content}
          article
          liveMetrics={liveMetrics}
          interactive={interactive}
          display={display}
          minutes={minutes}
        />
        <ContentLanguages
          content={{
            id: content.id,
            language: content.language,
            translations: content.translations,
          }}
        />
      </div>
      {below && image}
    </header>
  );
}
