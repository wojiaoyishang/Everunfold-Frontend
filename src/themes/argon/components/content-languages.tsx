"use client";
import { useMemo, useState } from "react";
import type { Content } from "@/core/content/types";
import { languageName } from "@/core/i18n/catalog";
import { languageSearchText, searchText } from "@/core/i18n/search";
import { useLocale, useT, useLanguageCatalog } from "@/core/i18n/provider";
import { ActionPopover } from "./ui/action-popover";
import { Form, TextField, TextLink } from "./ui/primitives";
import { LanguageLabel } from "./language-label";
import { Icon } from "./icon";
import styles from "./languages.module.css";

export function ContentLanguages({
  content,
}: {
  content: Pick<Content, "id" | "language" | "translations">;
}) {
  const { change, uiLocale } = useLocale(),
    catalog = useLanguageCatalog(),
    t = useT();
  const [query, setQuery] = useState("");
  const variants = content.translations;
  const entries = useMemo(
    () =>
      (variants ?? []).map((item) => ({
        ...item,
        search: languageSearchText(
          item.language,
          languageName(catalog, item.language),
          uiLocale,
        ),
      })),
    [variants, catalog, uiLocale],
  );
  if (entries.length < 2) return null;
  const current = entries.find((item) => item.id === content.id);
  const others = entries.filter((item) => item.id !== content.id);
  const ordered = current ? [current, ...others] : entries;
  const collapsed = entries.length > 3;
  const visible = collapsed
    ? ordered.filter((item) => item.id === content.id)
    : ordered;
  const link = (item: (typeof entries)[number], close?: () => void) => (
    <TextLink
      key={item.id}
      href={item.path}
      hrefLang={item.language}
      lang={item.language}
      title={languageName(catalog, item.language)}
      onClick={() => {
        change(
          item.language,
          catalog.languages.find((entry) => entry.code === item.language)
            ?.ui_locale,
        );
        close?.();
      }}
      aria-current={item.id === content.id ? "page" : undefined}
    >
      <LanguageLabel code={item.language} />
      {(item.id === content.id || item.access !== "public") && (
        <span className={styles.versionStatus}>
          {item.id === content.id && <Icon name="check" />}
          {item.access !== "public" && <Icon name="lock" />}
        </span>
      )}
    </TextLink>
  );
  const matches = ordered.filter((item) =>
    item.search.includes(searchText(query)),
  );
  return (
    <nav
      className={`${styles.versions}${collapsed ? " " + styles.collapsed : ""}`}
      aria-label={t("语言版本")}
    >
      {visible.map((item) => link(item))}
      {collapsed && (
        <ActionPopover
          label={t("更多语言（{count}）", { count: others.length })}
          className={styles.more}
          panelClassName={`${styles.menu} ${styles.versionMenu}`}
          panelWidth={320}
          triggerContent={
            <>
              <span className={styles.moreText}>{t("更多语言")}</span>
              <span>+{others.length}</span>
              <Icon name="chevron-down" />
            </>
          }
        >
          {(close) => (
            <>
              <Form
                className={styles.versionSearch}
                role="search"
                aria-label={t("搜索语言版本")}
                onSubmit={(event) => event.preventDefault()}
              >
                <Icon name="search" />
                <TextField
                  type="search"
                  aria-label={t("搜索语言版本")}
                  placeholder={t("搜索语言名称或代码")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </Form>
              <div className={styles.versionResults}>
                {matches.map((item) => link(item, close))}
                {!matches.length && (
                  <p className={styles.noMatches} role="status">
                    {t("没有匹配的语言")}
                  </p>
                )}
              </div>
            </>
          )}
        </ActionPopover>
      )}
      {collapsed && (
        <noscript>
          <div className={styles.noScriptVariants}>
            {others.map((item) => link(item))}
          </div>
        </noscript>
      )}
    </nav>
  );
}
