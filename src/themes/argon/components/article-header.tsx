import Image from "next/image";
import type { Content } from "@/core/content/types";
import { resourceUrl, taxonomyHref } from "@/core/content/urls";
import { AppLink as Link } from "./navigation-link";
import { PostMeta } from "./post-meta";

export function ArticleHeader({
  content,
  liveMetrics = true,
  interactive = true,
}: {
  content: Content;
  liveMetrics?: boolean;
  interactive?: boolean;
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
        />
      </div>
    </header>
  );
}
