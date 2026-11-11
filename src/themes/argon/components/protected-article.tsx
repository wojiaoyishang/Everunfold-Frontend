"use client";
import { usePluginRuntime } from "@/core/plugins/runtime/context";

import { useMemo } from "react";
import type { Content, Site } from "@/core/content/types";
import { useProtectedContent } from "@/core/content/use-protected-content";
import { renderContent } from "@/core/rendering/content";
import { ContentMarkup } from "./content-markup";
import { ArticleHeader } from "./article-header";
import { ArticleMedia } from "./article-media";
import { PagePresentation } from "./route-state";
import { useCaptcha } from "@/core/captcha/use-captcha";
import { ReadingAccessForm } from "./reading-access-form";
import { CommentSection } from "./comments/comment-section";
import styles from "./protected-article.module.css";

export function ProtectedArticle({
  content,
  site,
  baseUrl,
}: {
  content: Content;
  site: Site;
  baseUrl: string;
}) {
  const runtime = usePluginRuntime();
  const access = useProtectedContent(
    baseUrl,
    content.id,
    content.opens_at,
    content.captcha_required,
  );
  const captcha = useCaptcha(baseUrl, "read", content.id, !access.content);
  const readable = access.content ?? content;
  const rendered = useMemo(() => {
    void runtime.catalog?.revision;
    return renderContent(readable, site.settings?.shortcodes);
  }, [readable, site.settings?.shortcodes, runtime.catalog?.revision]);
  return (
    <>
      <PagePresentation id={content.id} site={site} toc={rendered.toc} />
      <article className="surface article-card" data-theme-content={content.id}>
        <ArticleHeader content={readable} liveMetrics={false} />
        {access.content ? (
          <div className={`article-body ${styles.revealed}`}>
            <ArticleMedia enabled={access.content.show_image_viewer !== false}>
              <ContentMarkup
                className="article-content"
                html={rendered.html}
                features={rendered.features}
              />
            </ArticleMedia>
          </div>
        ) : (
          <ReadingAccessForm
            captcha={captcha}
            pending={access.pending}
            error={access.error}
            passwordRequired={
              content.password_required ?? content.access !== "captcha"
            }
            opensAt={content.opens_at}
            onUnlock={(password) => access.load(password, captcha.response)}
          />
        )}
      </article>
      {access.content && (
        <CommentSection
          contentId={content.id}
          readReceipt={access.content.read_receipt}
          open={access.content.comments_open}
          comments={access.content.unlocked_comments ?? []}
          path={content.path}
        />
      )}
    </>
  );
}
