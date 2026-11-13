import Image from "next/image";
import type { Site } from "@/core/content/types";
import { UiText } from "@/core/i18n/provider";
import type { renderGlossaryContent } from "@/core/glossary/content";
import { PagePresentation } from "../components/route-state";
import { ContentMarkup } from "../components/content-markup";
import { ArticleMedia } from "../components/article-media";
import { Icon } from "../components/icon";
import { AppLink } from "../components/navigation-link";
import styles from "./glossary.module.css";

export function GlossaryDetailPage({
  id,
  title,
  summary,
  aliases,
  featureImage,
  showImageViewer,
  rendered,
  site,
}: {
  id: string;
  title: string;
  summary: string;
  aliases: string[];
  featureImage?: string;
  showImageViewer: boolean;
  rendered: ReturnType<typeof renderGlossaryContent>;
  site: Site;
}) {
  return (
    <>
      <PagePresentation site={site} id={`glossary:${id}`} />
      <nav className={styles.breadcrumb} aria-label="术语表">
        <AppLink href="/glossary">
          <Icon name="arrow" />
          <UiText text="术语表" />
        </AppLink>
      </nav>
      <ArticleMedia
        enabled={showImageViewer}
        selector=".article-content img[src], [data-reader-image] img[src]"
        className={styles.imageViewerScope}
      >
        <article className={`surface ${styles.detail}`}>
          <header className={featureImage ? styles.detailHeaderWithImage : ""}>
            <div>
              <span className={styles.kicker}>
                <Icon name="book" />
                <UiText text="术语" />
              </span>
              <h1>{title}</h1>
              {summary.trim() && <p>{summary}</p>}
              {aliases.length > 0 && (
                <small>
                  <UiText
                    text="也称为：{aliases}"
                    values={{ aliases: aliases.join(" · ") }}
                  />
                </small>
              )}
            </div>
            {featureImage && (
              <span className={styles.detailFeature} data-reader-image>
                <Image
                  src={featureImage}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 260px"
                  unoptimized
                />
              </span>
            )}
          </header>
          <div className={styles.detailDivider} role="separator" />
          <div className={styles.detailBody}>
            <ContentMarkup
              className="article-content"
              html={rendered.html}
              features={rendered.features}
            />
          </div>
        </article>
      </ArticleMedia>
    </>
  );
}
