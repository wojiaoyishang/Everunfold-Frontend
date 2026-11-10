"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import type { GlossaryContract } from "@/core/contracts/glossary";
import { readGlossaryDetail } from "@/core/contracts/glossary";
import { UiText, useLocale, useT } from "@/core/i18n/provider";
import { translate } from "@/core/i18n/messages";
import { renderGlossaryContent } from "@/core/glossary/content";
import { PagePresentation, useRouteState } from "../components/route-state";
import { ContentMarkup } from "../components/content-markup";
import { useReaderBaseUrl } from "../components/reader-data";
import { Icon } from "../components/icon";
import { AppLink } from "../components/navigation-link";
import styles from "./glossary.module.css";

type Detail = NonNullable<GlossaryContract["public_detail"]["data"]>;

export function GlossaryDetailPage({ slug }: { slug: string }) {
  const baseUrl = useReaderBaseUrl();
  const { locale, uiLocale } = useLocale();
  const t = useT();
  const { site } = useRouteState();
  const [term, setTerm] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void readGlossaryDetail(baseUrl, slug, locale, {
      signal: controller.signal,
    })
      .then((response) => {
        setTerm(response.data);
        document.title = `${response.data.title} · ${translate("术语表", uiLocale)} · ${site.name}`;
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(translate("词条不存在或暂时不可用。", uiLocale));
      });
    return () => controller.abort();
  }, [baseUrl, locale, site.name, slug, uiLocale]);
  const rendered = useMemo(
    () =>
      term ? renderGlossaryContent(term, site.settings?.shortcodes) : null,
    [site.settings?.shortcodes, term],
  );
  return (
    <>
      <PagePresentation site={site} id={`glossary:${slug}`} />
      <nav className={styles.breadcrumb} aria-label={t("返回术语表")}>
        <AppLink href="/glossary">
          <Icon name="arrow" />
          <UiText text="术语表" />
        </AppLink>
      </nav>
      {!term && !error && (
        <div className={`surface ${styles.state}`} role="status">
          <Icon name="refresh" className={styles.spin} />
          <UiText text="正在读取词条…" />
        </div>
      )}
      {error && (
        <div className={`surface ${styles.state}`} role="alert">
          <Icon name="cloud-off" />
          {error}
        </div>
      )}
      {term && rendered && (
        <article className={`surface ${styles.detail}`}>
          <header
            className={term.feature_image ? styles.detailHeaderWithImage : ""}
          >
            <div>
              <span className={styles.kicker}>
                <Icon name="book" />
                <UiText text="术语" />
              </span>
              <h1>{term.title}</h1>
              {term.summary.trim() && <p>{term.summary}</p>}
              {term.aliases.length > 0 && (
                <small>
                  <UiText
                    text="也称为：{aliases}"
                    values={{ aliases: term.aliases.join(" · ") }}
                  />
                </small>
              )}
            </div>
            {term.feature_image && (
              <span className={styles.detailFeature}>
                <Image
                  src={term.feature_image.original}
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
      )}
    </>
  );
}
