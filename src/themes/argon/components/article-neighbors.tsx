import type { Content, PublicSnapshot } from "@/core/content/types";
import { articleNeighbors } from "@/core/content/related";
import { AppLink } from "./navigation-link";
import { Icon } from "./icon";
import { StoryCover } from "./story-cover";

function NeighborCard({
  content,
  direction,
}: {
  content: Content | undefined;
  direction: "previous" | "next";
}) {
  const label = direction === "previous" ? "上一篇" : "下一篇";
  const className = `surface neighbor-card neighbor-${direction}`;
  if (!content) {
    return (
      <div className={`${className} neighbor-empty`}>
        <small>{label}</small>
        <span>
          {direction === "previous" ? "已经是最早一篇" : "已经是最新一篇"}
        </span>
      </div>
    );
  }
  return (
    <AppLink
      href={content.path}
      expectedContent
      className={className}
      aria-label={`${label}：${content.title}`}
    >
      <StoryCover
        src={content.cover_url}
        sizes="(max-width: 900px) 50vw, 420px"
      />
      <small>
        <Icon name="arrow" />
        {label}
      </small>
      <span className="neighbor-title">{content.title}</span>
    </AppLink>
  );
}

export function ArticleNeighbors({
  snapshot,
  content,
}: {
  snapshot: PublicSnapshot;
  content: Content;
}) {
  const { previous, next } = articleNeighbors(snapshot, content);
  return (
    <nav className="article-neighbors" aria-label="相邻文章">
      <NeighborCard content={previous} direction="previous" />
      <NeighborCard content={next} direction="next" />
    </nav>
  );
}
