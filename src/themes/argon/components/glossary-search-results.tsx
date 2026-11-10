"use client";

import { useEffect, useId, useState } from "react";

import type { GlossaryContract } from "@/core/contracts/glossary";
import { loadGlossaryIndex } from "@/core/glossary/runtime";
import { filterGlossaryTerms } from "@/core/glossary/search";
import { useLocale } from "@/core/i18n/provider";
import type { FeedType } from "@/core/content/presentation";
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
  type: FeedType;
  allLanguages?: boolean;
  language?: string;
}) {
  const baseUrl = useReaderBaseUrl();
  const { locale } = useLocale();
  const heading = useId();
  const needle = query.trim();
  const language = allLanguages ? "" : (selectedLanguage ?? locale);
  const queryKey = `${language}\0${needle}`;
  const [result, setResult] = useState<{ key: string; terms: PublicTerm[] }>({
    key: "",
    terms: [],
  });
  useEffect(() => {
    if (!needle || type !== "all") return;
    let active = true;
    void loadGlossaryIndex(baseUrl, language)
      .then((index) => {
        if (active) setResult({ key: queryKey, terms: index.terms });
      })
      .catch(() => {
        if (active) setResult({ key: queryKey, terms: [] });
      });
    return () => {
      active = false;
    };
  }, [baseUrl, language, needle, queryKey, type]);
  if (!needle || type !== "all") return null;
  const terms = result.key === queryKey ? result.terms : [];
  const matches = filterGlossaryTerms(terms, needle, 20);
  if (!matches.length) return null;
  return (
    <section
      className="surface glossary-search-results"
      aria-labelledby={heading}
    >
      <header>
        <div>
          <span>
            <Icon name="book" />
            术语
          </span>
          <h2 id={heading}>相关术语</h2>
        </div>
        <small>
          {matches.length}
          {matches.length === 20 ? "+" : ""} 条
        </small>
      </header>
      <div className="glossary-search-grid">
        {matches.map((term) => (
          <AppLink key={term.id} href={term.path}>
            <Icon name="book" />
            <span>
              <strong>{term.title}</strong>
              {term.summary.trim() && <small>{term.summary}</small>}
              {term.aliases.length > 0 && (
                <em>别名：{term.aliases.join(" · ")}</em>
              )}
            </span>
            <Icon name="chevron" />
          </AppLink>
        ))}
      </div>
    </section>
  );
}
