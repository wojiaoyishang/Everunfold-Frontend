"use client";
import { Button } from "@/themes/argon/components/ui/primitives";

import { useState } from "react";

export function CodeTools({
  code,
  onWrap,
  onExpand,
  wrapped,
  expanded,
}: {
  code: string;
  onWrap: () => void;
  onExpand: () => void;
  wrapped: boolean;
  expanded: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="code-tools">
      <Button type="button" aria-pressed={wrapped} onClick={onWrap}>
        折行
      </Button>
      <Button type="button" aria-pressed={expanded} onClick={onExpand}>
        {expanded ? "退出展开" : "展开代码"}
      </Button>
      <Button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setError(false);
          } catch {
            setError(true);
          }
        }}
      >
        {copied ? "已复制" : "复制代码"}
      </Button>
      <span role="status">
        {error
          ? "复制未获允许，请选中代码手动复制。"
          : copied
            ? "代码已复制"
            : ""}
      </span>
    </div>
  );
}

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [wrapped, setWrapped] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return (
    <figure
      className="reader-code"
      data-wrapped={wrapped}
      data-expanded={expanded}
    >
      <figcaption>
        {language || "CODE"}
        <CodeTools
          code={code}
          wrapped={wrapped}
          expanded={expanded}
          onWrap={() => setWrapped(!wrapped)}
          onExpand={() => setExpanded(!expanded)}
        />
      </figcaption>
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
