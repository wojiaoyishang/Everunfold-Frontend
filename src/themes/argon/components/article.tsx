import type { Content, PublicSnapshot } from "@/core/content/types";
import { contentMetadata } from "@/core/content/client-data";
import { renderContentForReader } from "@/core/rendering/render-content-server";
import { CommentSection } from "./comments/comment-section";
import { PagePresentation } from "./route-state";
import {
  ServerThemeComponent,
  ServerThemeTemplate,
} from "@/core/extensions/server-components";
import { RelatedArticles } from "./related-articles";
import { articleDisplay } from "./article-reading";
import { ArticleNeighbors } from "./article-neighbors";
import { ReaderPreviewRegistration } from "./reader-preview";
import { themeProfile } from "@/core/settings/theme-options";

export async function Article({
  theme,
  snapshot,
  content,
  commentsPage = 1,
}: {
  theme: string;
  snapshot: PublicSnapshot;
  content: Content;
  commentsPage?: number;
}) {
  const rendered = await renderContentForReader(content);
  const profile = themeProfile(snapshot.site.settings);
  const display = articleDisplay(content, profile?.article);
  const glossary = snapshot.site.settings?.site.glossary;
  const presentation = contentMetadata(content);
  return (
    <>
      <PagePresentation
        site={snapshot.site}
        toc={display.show_toc === false ? [] : rendered.toc}
        id={content.id}
      />
      {content.kind === "article" && <ReaderPreviewRegistration />}
      <ServerThemeTemplate
        theme={theme}
        name={content.kind === "page" ? "page" : "article"}
        context={{ site: snapshot.site, content, path: content.path }}
      >
        <ServerThemeComponent
          theme={theme}
          name="public.article.card"
          content={presentation}
          rendered={rendered}
          glossary={{
            auto_match: glossary?.auto_match ?? true,
            max_matches_per_page: glossary?.max_matches_per_page ?? 20,
            popup_source: glossary?.popup_source ?? "content",
            show_tooltips: content.show_glossary_tooltips ?? true,
            show_footnotes: content.show_glossary_footnotes ?? true,
          }}
          articleDisplay={display}
          code={profile?.code}
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
                  limit={display.related_count ?? 6}
                  basis={display.related_basis}
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
      </ServerThemeTemplate>
    </>
  );
}
