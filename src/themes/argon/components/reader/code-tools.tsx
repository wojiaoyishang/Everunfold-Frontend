"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useState } from "react";
import { Button } from "../ui/primitives";
import { Icon } from "../icon";
export function CodeTools({
  code,
  onWrap,
  wrapped,
}: {
  code: string;
  onWrap: () => void;
  wrapped: boolean;
}) {
  const [result, setResult] = useState<"copied" | "error">();
  useEffect(() => {
    if (!result) return;
    const timeout = window.setTimeout(() => setResult(undefined), 2500);
    return () => window.clearTimeout(timeout);
  }, [result]);
  return (
    <div className="content-code-tools" role="group" aria-label="代码操作">
      <Button
        aria-label="代码自动换行"
        title="自动换行"
        aria-pressed={wrapped}
        onClick={onWrap}
      >
        <Icon name="wrap" />
      </Button>
      <Button
        aria-label={result === "copied" ? "代码已复制" : "复制代码"}
        title={result === "copied" ? "已复制" : "复制代码"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setResult("copied");
          } catch {
            setResult("error");
          }
        }}
      >
        <Icon name={result === "copied" ? "check" : "copy"} />
      </Button>
      <span className="content-code-result" role="status">
        {result === "error" ? (
          <UiText text="请选中代码手动复制" />
        ) : result === "copied" ? (
          <UiText text="已复制" />
        ) : (
          ""
        )}
      </span>
    </div>
  );
}

export function CodeFoldControl({
  expanded,
  contentId,
  onToggle,
}: {
  expanded: boolean;
  contentId: string;
  onToggle: () => void;
}) {
  return (
    <Button
      className="content-code-fold"
      aria-label={expanded ? "折叠代码" : "展开全部代码"}
      aria-expanded={expanded}
      aria-controls={contentId}
      onClick={onToggle}
    >
      <span>
        {expanded ? <UiText text="收起代码" /> : <UiText text="展开代码" />}
      </span>
      <Icon name={expanded ? "chevron-up" : "chevron-down"} />
    </Button>
  );
}
