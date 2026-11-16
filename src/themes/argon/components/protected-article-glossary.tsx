"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  readProtectedGlossaryMatches,
  type GlossaryContract,
} from "@/core/contracts/glossary";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";
import GlossaryFootnotes from "./glossary-footnotes";
import GlossaryTooltips from "./glossary-tooltips";

export default function ProtectedArticleGlossary({
  baseUrl,
  contentId,
  options,
  readReceipt,
  root,
}: {
  baseUrl: string;
  contentId: string;
  options: GlossaryRuntimeOptions;
  readReceipt: string;
  root: RefObject<HTMLDivElement | null>;
}) {
  const [index, setIndex] = useState<
    GlossaryContract["content_matches"]["data"] | null
  >(null);

  useEffect(() => {
    const abort = new AbortController();
    void readProtectedGlossaryMatches(baseUrl, contentId, readReceipt, {
      signal: abort.signal,
    })
      .then(({ data }) => {
        if (!abort.signal.aborted) setIndex(data);
      })
      .catch(() => {
        // Glossary availability is independent from reading access.
      });
    return () => abort.abort();
  }, [baseUrl, contentId, readReceipt]);

  if (!index?.terms.length) return null;
  return (
    <>
      {options.show_tooltips && (
        <GlossaryTooltips
          root={root}
          options={options}
          matchIndex={index}
          markupSelector="[data-content-features]"
        />
      )}
      {options.show_footnotes && (
        <GlossaryFootnotes contentId={contentId} matchIndex={index} />
      )}
    </>
  );
}
