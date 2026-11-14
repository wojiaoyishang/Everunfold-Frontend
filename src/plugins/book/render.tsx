"use client";

import { useState } from "react";
import type { CustomPageProps } from "@everunfold/plugin-sdk";
import {
  AppLink,
  Icon,
  Pagination,
  PublicDate,
  UiText,
  resourceUrl,
  taxonomyHref,
  useT,
} from "@everunfold/plugin-sdk/client";
import styles from "./styles.module.css";

export function BookPage({
  page,
  articleCollection,
  pathname = page.path,
  preview,
}: CustomPageProps) {
  const t = useT();
  const {
    items = [],
    categoryName,
    total = 0,
    page: current = 1,
    pages = 1,
    pageSize = 8,
    from,
    to,
  } = articleCollection ?? {};
  const cover =
    typeof page.options?.cover_url === "string"
      ? resourceUrl(page.options.cover_url)
      : null;
  const subtitle =
    typeof page.options?.subtitle === "string"
      ? page.options.subtitle.trim().slice(0, 160)
      : "";
  return (
    <div className={styles.book}>
      <div className={styles.spread}>
        <section className={styles.cover}>
          {cover && <BookCover key={cover} source={cover} />}
          <div className={styles.coverContent}>
            <div>
              {!page.hide_title && <h1>{page.title}</h1>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
              {page.description && (
                <p className={styles.description}>{page.description}</p>
              )}
            </div>
            <div className={styles.coverDetails}>
              {categoryName && <span>{categoryName}</span>}
              <span>{t("{count} 篇文章", { count: total })}</span>
              {from && to && (
                <span>
                  <PublicDate value={from} />
                  {from !== to && (
                    <>
                      {" "}
                      – <PublicDate value={to} />
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </section>
        <section className={styles.paper}>
          <header className={styles.paperHeader}>
            <h2>
              <UiText text="书籍目录" />
            </h2>
            {pages > 1 && <span>{t("第 {page} 页", { page: current })}</span>}
          </header>
          {items.length ? (
            <ol
              className={styles.contents}
              start={(current - 1) * pageSize + 1}
            >
              {items.map((item, index) => (
                <li key={item.id}>
                  <span aria-hidden="true" className={styles.number}>
                    {String((current - 1) * pageSize + index + 1).padStart(
                      2,
                      "0",
                    )}
                  </span>
                  <div className={styles.chapter}>
                    <div className={styles.chapterLine}>
                      <AppLink
                        href={item.path}
                        localize={false}
                        expectedContent
                      >
                        {item.title}
                      </AppLink>
                      <time dateTime={item.published_at}>
                        <PublicDate value={item.published_at} />
                      </time>
                    </div>
                    {item.tags.length > 0 && (
                      <ul className={styles.tags} aria-label={t("标签")}>
                        {item.tags.map((tag) => (
                          <li key={tag.id}>
                            <AppLink
                              href={taxonomyHref({
                                kind: "tag",
                                slug: tag.slug,
                              })}
                            >
                              {tag.name}
                            </AppLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.empty}>
              <Icon name="book" />
              <p>
                <UiText
                  text={
                    preview && !page.options?.category_id
                      ? "选择文章分类后预览目录。"
                      : "书中暂时没有文章。"
                  }
                />
              </p>
            </div>
          )}
          {pages > 1 && (
            <footer className={styles.paperFooter}>
              <span>{page.title}</span>
              <span>
                {current} / {pages}
              </span>
            </footer>
          )}
        </section>
      </div>
      {!preview && (
        <Pagination
          pathname={pathname}
          page={current}
          pages={pages}
          label={t("书籍分页")}
          localize={false}
        />
      )}
    </div>
  );
}

function BookCover({ source }: { source: string }) {
  const [broken, setBroken] = useState(false);
  return broken ? null : (
    // eslint-disable-next-line @next/next/no-img-element -- configured cover URLs may use an independent media origin.
    <img
      className={styles.coverImage}
      src={source}
      alt=""
      onError={() => setBroken(true)}
    />
  );
}
