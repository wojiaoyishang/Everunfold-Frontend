"use client";
import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { syntaxHighlighting } from "@codemirror/language";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { MergeView } from "@codemirror/merge";
import { sourceHighlight } from "./source-highlight";
import styles from "./code-diff.module.css";

/** Read-only, aligned source differences. The document owns the vertical scroll. */
export function CodeDiff({
  before,
  after,
  format = "text",
}: {
  before: string;
  after: string;
  format?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const extensions = (label: string) => [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.contentAttributes.of({ "aria-label": label }),
      EditorView.lineWrapping,
      lineNumbers(),
      syntaxHighlighting(sourceHighlight),
      ...(format === "html"
        ? [html()]
        : format === "markdown"
          ? [markdown()]
          : []),
    ];
    const view = new MergeView({
      parent: host.current,
      a: { doc: before, extensions: extensions("修改前源码") },
      b: { doc: after, extensions: extensions("修改后源码") },
      collapseUnchanged: { margin: 3, minSize: 8 },
      diffConfig: { scanLimit: 5000, timeout: 50 },
      gutter: true,
    });
    return () => view.destroy();
  }, [before, after, format]);
  return <div ref={host} className={styles.diff} />;
}
