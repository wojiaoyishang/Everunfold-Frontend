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
}: {
  content: ContentMetadata;
  liveMetrics?: boolean;
  interactive?: boolean;
  display?: ArticleDisplayPreferences;
}) {
  const cover = resourceUrl(content.cover_url);
  return (
    <header className={`article-header${cover ? " has-cover" : ""}`}>
      {cover && (
        <div className="article-cover" aria-hidden="true">
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 900px"
            unoptimized
            preload
          />
        </div>
      )}
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
        />
        <ContentLanguages
          content={{
            id: content.id,
            language: content.language,
            translations: content.translations,
          }}
        />
      </div>
    </header>
  );
}
