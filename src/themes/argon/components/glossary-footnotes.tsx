"use client";

import { useEffect, useMemo, useState } from "react";
import type { GlossaryContract } from "@/core/contracts/glossary";
import type { PublicShortcode } from "@/core/contracts/settings";
import { loadGlossaryMatches } from "@/core/glossary/runtime";
import { renderGlossaryPreview } from "@/core/glossary/content";
import { translate } from "@/core/i18n/messages";
import { useLocale, useT } from "@/core/i18n/provider";
import { AppLink } from "./navigation-link";
import { Icon } from "./icon";
import { useReaderBaseUrl } from "./reader-data";
import { useRouteState } from "./route-state";

type MatchIndex = NonNullable<GlossaryContract["content_matches"]["data"]>;
type MatchTerm = MatchIndex["terms"][number];

const blockSelector =
  "p,h1,h2,h3,h4,h5,h6,li,td,th,pre,blockquote,figcaption,summary";

function normalizeText(value: string) {
  return value.replaceAll("\u200b", "").replace(/\s+/g, " ").trim();
}

function richTextExcerpt(
  term: MatchTerm,
  shortcodes: readonly PublicShortcode[] = [],
) {
  const preview = renderGlossaryPreview(term, shortcodes);
  if (!preview || typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString(preview.html, "text/html");
  for (const ignored of document.querySelectorAll("script,style"))
    ignored.remove();
  const groups = new Map<Element, string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.data.trim()) continue;
    const block = node.parentElement?.closest(blockSelector) ?? document.body;
    groups.set(block, `${groups.get(block) ?? ""}${node.data}`);
  }
  const text = normalizeText([...groups.values()].join(" "));
  return text;
}

export default function GlossaryFootnotes({
  contentId,
  revision,
}: {
  contentId: string;
  revision: string;
}) {
  const baseUrl = useReaderBaseUrl();
  const { site } = useRouteState();
  const { uiLocale } = useLocale();
  const t = useT();
  const [index, setIndex] = useState<MatchIndex | null>(null);

  useEffect(() => {
    let active = true;
    void loadGlossaryMatches(baseUrl, contentId, revision)
      .then((value) => {
        if (active) setIndex(value);
      })
      .catch(() => {
        /* Footnotes never block the already-rendered article. */
      });
    return () => {
      active = false;
    };
  }, [baseUrl, contentId, revision]);

  const items = useMemo(
    () =>
      (index?.terms ?? []).map((term) => ({
        term,
        hint:
          normalizeText(term.summary) ||
          richTextExcerpt(term, site.settings?.shortcodes ?? []) ||
          translate("查看词条了解详情", uiLocale),
      })),
    [index?.terms, site.settings?.shortcodes, uiLocale],
  );

  if (!index?.terms.length) return null;
  const titleId = `glossary-footnotes-${contentId}`;
  return (
    <aside
      className="glossary-footnotes"
      aria-labelledby={titleId}
      data-glossary-footnotes
    >
      <header>
        <Icon name="book" />
        <div>
          <h2 id={titleId}>{t("术语脚注")}</h2>
          <p>{t("本篇出现过的词条，按实际匹配结果列出。")}</p>
        </div>
      </header>
      <ul>
        {items.map(({ term, hint }) => (
          <li key={term.id}>
            <AppLink
              href={term.path}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("打开术语：{title}", { title: term.title })}
            >
              <strong title={term.title}>{term.title}</strong>
              <span title={hint}>{hint}</span>
              <Icon name="chevron" />
            </AppLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
