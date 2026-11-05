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
  beforeLabel = "修改前",
  afterLabel = "修改后",
  compact = true,
}: {
  before: string;
  after: string;
  format?: string;
  beforeLabel?: string;
  afterLabel?: string;
  compact?: boolean;
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
      a: { doc: before, extensions: extensions(`${beforeLabel}源码`) },
      b: { doc: after, extensions: extensions(`${afterLabel}源码`) },
      ...(compact ? { collapseUnchanged: { margin: 3, minSize: 8 } } : {}),
      diffConfig: { scanLimit: 5000, timeout: 50 },
      gutter: true,
    });
    for (const [editor, label] of [
      [view.a, beforeLabel],
      [view.b, afterLabel],
    ] as const) {
      const heading = document.createElement("div");
      heading.className = styles.sideHeading;
      heading.textContent = label;
      editor.dom.parentElement?.prepend(heading);
    }
    return () => view.destroy();
  }, [before, after, format, beforeLabel, afterLabel, compact]);
  return <div ref={host} className={styles.diff} />;
}
