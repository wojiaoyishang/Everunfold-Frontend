import { UiText } from "@/core/i18n/provider";
import type { FeedEntry } from "@/core/content/presentation";
import type { PublicSnapshot } from "@/core/content/types";
import { contentMetadata } from "@/core/content/client-data";
import { renderContentForReader } from "@/core/rendering/render-content-server";
import {
  ServerThemeComponent,
  ServerThemeTemplate,
} from "@/core/extensions/server-components";
import { PagePresentation } from "./route-state";
import { CommentSection } from "./comments/comment-section";
import { ArticleActions } from "./article-actions";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";

export async function ShuoshuoCard({
  theme,
  entry,
  detail = false,
  glossary,
}: {
  theme: string;
  entry: FeedEntry;
  detail?: boolean;
  glossary?: GlossaryRuntimeOptions;
}) {
  const rendered = await renderContentForReader(entry.content);
  return (
    <ServerThemeComponent
      theme={theme}
      name="public.shuoshuo.card"
      entry={{
        ...entry,
        content: contentMetadata(entry.content),
      }}
      detail={detail}
      rendered={rendered}
      glossary={glossary}
    />
  );
}

export function ShuoshuoDetail({
  theme,
  entry,
  snapshot,
}: {
  theme: string;
  entry: FeedEntry;
  snapshot: PublicSnapshot;
}) {
  const glossary = snapshot.site.settings?.site.glossary;
  return (
    <>
      <PagePresentation site={snapshot.site} id={entry.content.id} />
      <ServerThemeTemplate
        theme={theme}
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
        <ShuoshuoCard
          theme={theme}
          entry={entry}
          detail
          glossary={{
            auto_match: glossary?.auto_match ?? true,
            max_matches_per_page: glossary?.max_matches_per_page ?? 20,
            popup_source: glossary?.popup_source ?? "content",
            show_footnotes: glossary?.shuoshuo_footnotes ?? true,
          }}
        />
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
      </ServerThemeTemplate>
    </>
  );
}
