"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  readProtectedGlossaryMatches,
  type GlossaryContract,
} from "@/core/contracts/glossary";
import { RequestError } from "@/core/http/request";
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
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        const response = error instanceof RequestError ? error : undefined;
        // Never log the read receipt or the protected body.
        console.warn("[Everunfold glossary]", {
          operation: "protected_content_matches",
          content_id: contentId,
          status: response?.status,
          code: response?.code,
          reason:
            response?.code === 50389
              ? "后端术语插件的构建指纹尚未同步；请用当前运行的后端版本登记插件清单。"
              : "解密后的术语加载失败；请检查后端术语插件版本、启用状态与网络请求。",
        });
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
