"use client";

import { useEffect, useMemo, useState } from "react";

import type { GlossaryContract } from "@/core/contracts/glossary";
import { readGlossaryDetail } from "@/core/contracts/glossary";
import { useLocale } from "@/core/i18n/provider";
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
  const { locale } = useLocale();
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
        document.title = `${response.data.title} · 术语表 · ${site.name}`;
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("词条不存在或暂时不可用。");
      });
    return () => controller.abort();
  }, [baseUrl, locale, site.name, slug]);
  const rendered = useMemo(
    () =>
      term ? renderGlossaryContent(term, site.settings?.shortcodes) : null,
    [site.settings?.shortcodes, term],
  );
  return (
    <>
      <PagePresentation site={site} id={`glossary:${slug}`} />
      <nav className={styles.breadcrumb} aria-label="返回术语表">
        <AppLink href="/glossary">
          <Icon name="arrow" />
          术语表
        </AppLink>
      </nav>
      {!term && !error && (
        <div className={`surface ${styles.state}`} role="status">
          <Icon name="refresh" className={styles.spin} />
          正在读取词条…
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
          <header>
            <span className={styles.kicker}>
              <Icon name="book" />
              术语
            </span>
            <h1>{term.title}</h1>
            {term.summary.trim() && <p>{term.summary}</p>}
            {term.aliases.length > 0 && (
              <small>也称为：{term.aliases.join(" · ")}</small>
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
