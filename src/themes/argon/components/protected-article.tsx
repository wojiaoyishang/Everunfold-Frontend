"use client";
import { ArticleAgeNotice } from "./article-age-notice";
import { usePluginRuntime } from "@/core/plugins/runtime/context";

import { lazy, Suspense, useMemo, useRef, type ReactNode } from "react";
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
import { ArticleTags } from "./article-tags";
import { PagePresentation } from "./route-state";
import { useCaptcha } from "@/core/captcha/use-captcha";
import { ReadingAccessForm } from "./reading-access-form";
import { CommentSection } from "./comments/comment-section";
import styles from "./protected-article.module.css";

const ProtectedArticleGlossary = lazy(
  () => import("./protected-article-glossary"),
);

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
  const glossaryRoot = useRef<HTMLDivElement>(null);
  const glossary = site.settings?.site.glossary;
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
              <div ref={glossaryRoot}>
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
              </div>
            </ArticleMedia>
            {access.content.read_receipt &&
              glossary?.auto_match !== false &&
              (readable.show_glossary_tooltips !== false ||
                readable.show_glossary_footnotes !== false) && (
                <Suspense fallback={null}>
                  <ProtectedArticleGlossary
                    key={access.content.read_receipt}
                    baseUrl={baseUrl}
                    contentId={content.id}
                    options={{
                      auto_match: true,
                      max_matches_per_page:
                        glossary?.max_matches_per_page ?? 20,
                      popup_source: glossary?.popup_source ?? "content",
                      show_tooltips: readable.show_glossary_tooltips ?? true,
                      show_footnotes: readable.show_glossary_footnotes ?? true,
                    }}
                    readReceipt={access.content.read_receipt}
                    root={glossaryRoot}
                  />
                </Suspense>
              )}
            <ArticleAfterword content={readable} display={display} />
            <ArticleTags tags={readable.tags} />
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
      {access.content && display.show_related !== false && recommendations && (
        <div className="article-followup">{recommendations}</div>
      )}
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
