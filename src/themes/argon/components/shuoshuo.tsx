import { UiText } from "@/core/i18n/provider";
import type { FeedEntry } from "@/core/content/presentation";
import type { PublicSnapshot } from "@/core/content/types";
import { renderContentForReader } from "@/core/rendering/render-content-server";
import { ExtensionComponent } from "@/core/extensions/components";
import { ThemeTemplate } from "@/core/themes/presentation";
import { PagePresentation } from "./route-state";
import { CommentSection } from "./comments/comment-section";
import { ArticleActions } from "./article-actions";

export async function ShuoshuoCard({
  entry,
  detail = false,
}: {
  entry: FeedEntry;
  detail?: boolean;
}) {
  const rendered = await renderContentForReader(entry.content);
  return (
    <ExtensionComponent
      name="public.shuoshuo.card"
      entry={entry}
      detail={detail}
      rendered={rendered}
    />
  );
}

export function ShuoshuoDetail({
  entry,
  snapshot,
}: {
  entry: FeedEntry;
  snapshot: PublicSnapshot;
}) {
  return (
    <>
      <PagePresentation site={snapshot.site} id={entry.content.id} />
      <ThemeTemplate
        name="shuoshuo"
        context={{
          site: snapshot.site,
          content: entry.content,
          path: entry.content.path,
        }}
      >
        {entry.example && (
          <p className="preview-notice">
            <UiText text="说说效果预览 · 以下内容为虚构样例，正式内容将在后续导入。" />
          </p>
        )}
        <ShuoshuoCard entry={entry} detail />
        <div className="surface shuoshuo-share">
          <ArticleActions
            path={entry.content.path}
            title={entry.content.title}
            commentsOpen={entry.content.comments_open}
          />
        </div>
        <CommentSection
          contentId={entry.example ? undefined : entry.content.id}
          open={entry.content.comments_open}
          comments={snapshot.comments[entry.content.id] ?? []}
          path={entry.content.path}
        />
      </ThemeTemplate>
    </>
  );
}
