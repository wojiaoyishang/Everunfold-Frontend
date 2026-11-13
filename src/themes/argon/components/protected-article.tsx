"use client";
import { ArticleAgeNotice } from "./article-age-notice";
import { usePluginRuntime } from "@/core/plugins/runtime/context";

import { useMemo, type ReactNode } from "react";
import type { Content, Site } from "@/core/content/types";
import { useProtectedContent } from "@/core/content/use-protected-content";
import { renderContent } from "@/core/rendering/content";
import { ShortcodeRegionBoundary } from "./shortcode-regions";
import { BuilderContent } from "../builder/content";
import { ContentMarkup } from "./content-markup";
import { themeProfile } from "@/core/settings/theme-options";
import {
  ArticleAfterword,
  articleDisplay,
  readingMinutes,
} from "./article-reading";
import { ArticleActions } from "./article-actions";
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
  recommendations,
}: {
  content: Content;
  site: Site;
  baseUrl: string;
  recommendations?: ReactNode;
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
  const display = articleDisplay(
    readable,
    themeProfile(site.settings)?.article,
  );
  const rendered = useMemo(() => {
    void runtime.catalog?.revision;
    return renderContent(readable, site.settings?.shortcodes);
  }, [readable, site.settings?.shortcodes, runtime.catalog?.revision]);
  return (
    <>
      <PagePresentation
        id={content.id}
        site={site}
        toc={display.show_toc === false ? [] : rendered.toc}
      />
      <article
        className="surface article-card"
        data-theme-content={content.id}
        data-article-layout={readable.article_layout}
      >
        <ArticleHeader
          content={readable}
          liveMetrics={false}
          display={display}
          minutes={readingMinutes(rendered.html, display)}
        />
        {access.content ? (
          <div className={`article-body ${styles.revealed}`}>
            <ArticleAgeNotice content={readable} display={display} />
            <ArticleMedia enabled={access.content.show_image_viewer !== false}>
              {readable.edit_mode === "components" &&
              readable.component_document ? (
                <div className="article-content">
                  <BuilderContent
                    document={readable.component_document}
                    context={{
                      contentId: content.id,
                      contentRevision: readable.updated_at,
                      media: readable.media_urls,
                      shortcodes: site.settings?.shortcodes,
                      readReceipt: access.content.read_receipt,
                    }}
                  />
                </div>
              ) : (
                <ShortcodeRegionBoundary
                  target={content.id}
                  readReceipt={access.content.read_receipt}
                >
                  <ContentMarkup
                    className="article-content"
                    html={rendered.html}
                    features={rendered.features}
                    contentId={content.id}
                    contentRevision={readable.updated_at}
                  />
                </ShortcodeRegionBoundary>
              )}
            </ArticleMedia>
            <ArticleAfterword content={readable} display={display} />
            {display.show_share !== false && (
              <ArticleActions
                path={content.path}
                title={content.title}
                commentsOpen={
                  display.show_comments !== false && readable.comments_open
                }
              />
            )}
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
      {access.content && display.show_related !== false && recommendations}
      {access.content && display.show_comments !== false && (
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
