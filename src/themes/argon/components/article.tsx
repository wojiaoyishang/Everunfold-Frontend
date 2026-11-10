import type { Content, PublicSnapshot } from "@/core/content/types";
import { renderContentForReader } from "@/core/rendering/render-content-server";
import { CommentSection } from "./comments/comment-section";
import { PagePresentation } from "./route-state";
import { ExtensionComponent } from "@/core/extensions/components";
import { ThemeTemplate } from "@/core/themes/presentation";
import { RelatedArticles } from "./related-articles";
import { ArticleNeighbors } from "./article-neighbors";
import { ReaderPreviewRegistration } from "./reader-preview";
import { themeProfile } from "@/core/settings/theme-options";

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
  const display = themeProfile(snapshot.site.settings)?.article;
  const glossary = snapshot.site.settings?.site.glossary;
  return (
    <>
      <PagePresentation
        site={snapshot.site}
        toc={rendered.toc}
        id={content.id}
      />
      {content.kind === "article" && <ReaderPreviewRegistration />}
      <ThemeTemplate
        name={content.kind === "page" ? "page" : "article"}
        context={{ site: snapshot.site, content, path: content.path }}
      >
        <ExtensionComponent
          name="public.article.card"
          content={content}
          rendered={rendered}
          glossary={{
            auto_match: glossary?.auto_match ?? true,
            max_matches_per_page: glossary?.max_matches_per_page ?? 20,
            popup_source: glossary?.popup_source ?? "summary",
          }}
          articleDisplay={display}
        />
        {content.kind === "article" && (
          <div className="article-followup">
            {display?.show_neighbors !== false && (
              <ArticleNeighbors snapshot={snapshot} content={content} />
            )}
            {display?.show_related !== false &&
              (display?.related_count ?? 6) > 0 && (
                <RelatedArticles
                  snapshot={snapshot}
                  content={content}
                  limit={display?.related_count ?? 6}
                />
              )}
          </div>
        )}
        {display?.show_comments !== false && (
          <CommentSection
            contentId={content.id}
            open={content.comments_open ?? true}
            key={content.id}
            comments={snapshot.comments[content.id] ?? []}
            path={content.path}
            initialPage={commentsPage}
          />
        )}
      </ThemeTemplate>
    </>
  );
}
