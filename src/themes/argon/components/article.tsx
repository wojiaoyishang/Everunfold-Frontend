import type { Content, PublicSnapshot } from "@/core/content/types";
import { renderContentForReader } from "@/core/rendering/render-content-server";
import { CommentSection } from "./comments/comment-section";
import { PagePresentation } from "./route-state";
import { ArticleCard } from "./article-card";
import { RelatedArticles } from "./related-articles";
import { ArticleNeighbors } from "./article-neighbors";
import { ReaderPreviewRegistration } from "./reader-preview";

export async function Article({
  snapshot,
  content,
  commentsPage = 1,
}: {
  snapshot: PublicSnapshot;
  content: Content;
  commentsPage?: number;
}) {
  const rendered = await renderContentForReader(content);
  return (
    <>
      <PagePresentation
        site={snapshot.site}
        toc={rendered.toc}
        id={content.id}
      />
      {content.kind === "article" && <ReaderPreviewRegistration />}
      <ArticleCard content={content} rendered={rendered} />
      {content.kind === "article" && (
        <div className="article-followup">
          <ArticleNeighbors snapshot={snapshot} content={content} />
          <RelatedArticles snapshot={snapshot} content={content} />
        </div>
      )}
      <CommentSection
        open={content.comments_open ?? true}
        key={content.id}
        comments={snapshot.comments[content.id] ?? []}
        path={content.path}
        initialPage={commentsPage}
      />
    </>
  );
}
