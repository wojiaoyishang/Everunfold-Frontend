"use client";

import { useEffect, useState } from "react";

import type { GlossaryContract } from "@/core/contracts/glossary";
import { loadGlossaryIndex } from "@/core/glossary/runtime";
import { useLocale } from "@/core/i18n/provider";
import { AppLink } from "../components/navigation-link";
import { PagePresentation, useRouteState } from "../components/route-state";
import { Icon } from "../components/icon";
import { useReaderBaseUrl } from "../components/reader-data";
import styles from "./glossary.module.css";

type Index = NonNullable<GlossaryContract["public_index"]["data"]>;

export function GlossaryDirectory() {
  const baseUrl = useReaderBaseUrl();
  const { locale } = useLocale();
  const { site } = useRouteState();
  const [index, setIndex] = useState<Index | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void loadGlossaryIndex(baseUrl, locale)
      .then((value) => {
        if (active) setIndex(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [baseUrl, locale]);
  const terms = index?.terms ?? [];
  return (
    <>
      <PagePresentation site={site} id="glossary" />
      <header className={`surface ${styles.heading}`}>
        <div>
          <span className={styles.kicker}>
            <Icon name="book" />
            术语表
          </span>
          <h1>散落在故事里的名词</h1>
          <p>浏览公开词条；需要按标题、别名或说明查找，请使用站内搜索。</p>
        </div>
      </header>
      {!index && !error && (
        <div className={`surface ${styles.state}`} role="status">
          <Icon name="refresh" className={styles.spin} />
          正在读取术语…
        </div>
      )}
      {error && (
        <div className={`surface ${styles.state}`} role="alert">
          <Icon name="cloud-off" />
          术语表暂时不可用，正文阅读不受影响。
        </div>
      )}
      {index && terms.length > 0 && (
        <div className={styles.grid}>
          {terms.map((term) => (
            <AppLink
              className={`surface ${styles.card}`}
              href={term.path}
              key={term.id}
            >
              <span className={styles.termIcon}>
                <Icon name="book" />
              </span>
              <div>
                <h2>{term.title}</h2>
                {term.summary.trim() && <p>{term.summary}</p>}
                {term.aliases.length > 0 && (
                  <small>别名：{term.aliases.join(" · ")}</small>
                )}
              </div>
              <Icon name="chevron" />
            </AppLink>
          ))}
        </div>
      )}
      {index && terms.length === 0 && (
        <div className={`surface ${styles.state}`}>
          <Icon name="book" />
          还没有发布术语
        </div>
      )}
    </>
  );
}
