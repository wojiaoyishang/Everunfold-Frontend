"use client";
import { glossaryTermPath } from "@/core/glossary/routes";

import { useEffect, useId, useState } from "react";

import type { GlossaryContract } from "@/core/contracts/glossary";
import { loadGlossaryIndex } from "@/core/glossary/runtime";
import { filterGlossaryTerms } from "@/core/glossary/search";
import { UiText, useLanguageCatalog, useLocale } from "@/core/i18n/provider";
import type { SearchType } from "@/core/content/presentation";
import { Icon } from "./icon";
import { AppLink } from "./navigation-link";
import { useReaderBaseUrl } from "./reader-data";

type PublicTerm = NonNullable<
  GlossaryContract["public_index"]["data"]
>["terms"][number];

export function GlossarySearchResults({
  query,
  type,
  allLanguages = false,
  language: selectedLanguage,
}: {
  query: string;
  type: SearchType;
  allLanguages?: boolean;
  language?: string;
}) {
  const baseUrl = useReaderBaseUrl();
  const { locale } = useLocale();
  const catalog = useLanguageCatalog();
  const heading = useId();
  const needle = query.trim();
  const language = allLanguages ? "" : (selectedLanguage ?? locale);
  const queryKey = `${language}\0${needle}`;
  const [result, setResult] = useState<{ key: string; terms: PublicTerm[] }>({
    key: "",
    terms: [],
  });
  const [failedKey, setFailedKey] = useState("");
  useEffect(() => {
    if (!needle || (type !== "all" && type !== "glossary")) return;
    let active = true;
    void loadGlossaryIndex(baseUrl, language)
      .then((index) => {
        if (active) setResult({ key: queryKey, terms: index.terms });
      })
      .catch(() => {
        if (active) {
          setFailedKey(queryKey);
          setResult({ key: queryKey, terms: [] });
        }
      });
    return () => {
      active = false;
    };
  }, [baseUrl, language, needle, queryKey, type]);
  if (!needle || (type !== "all" && type !== "glossary")) return null;
  const terms = result.key === queryKey ? result.terms : [];
  const matches = filterGlossaryTerms(terms, needle, 20);
  const loading = result.key !== queryKey;
  const glossaryOnly = type === "glossary";
  if (!matches.length && !glossaryOnly) return null;
  return (
    <section
      className="surface glossary-search-results"
      aria-labelledby={heading}
      aria-busy={loading}
    >
      <header>
        <div>
          <span>
            <Icon name="book" />
            <UiText text="术语" />
          </span>
          <h2 id={heading}>
            <UiText text="相关术语" />
          </h2>
        </div>
        {!loading && (
          <small>
            <UiText
              text="{count} 条"
              values={{
                count: `${matches.length}${matches.length === 20 ? "+" : ""}`,
              }}
            />
          </small>
        )}
      </header>
      {loading ? (
        <p className="glossary-search-state" role="status">
          <UiText text="正在读取术语…" />
        </p>
      ) : matches.length ? (
        <div className="glossary-search-grid">
          {matches.map((term) => (
            <AppLink
              key={term.id}
              href={glossaryTermPath(term, catalog) ?? term.path}
              localize={false}
            >
              <Icon name="book" />
              <span>
                <strong>{term.title}</strong>
                {term.summary.trim() && <small>{term.summary}</small>}
                {term.aliases.length > 0 && (
                  <em>
                    <UiText
                      text="别名：{aliases}"
                      values={{ aliases: term.aliases.join(" · ") }}
                    />
                  </em>
                )}
              </span>
              <Icon name="chevron" />
            </AppLink>
          ))}
        </div>
      ) : glossaryOnly ? (
        <p className="glossary-search-state" role="status">
          <UiText
            text={
              failedKey === queryKey
                ? "术语索引暂时不可用。"
                : "没有匹配的术语。"
            }
          />
        </p>
      ) : null}
    </section>
  );
}
