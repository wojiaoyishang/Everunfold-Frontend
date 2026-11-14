"use client";

import { createElement, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/core/i18n/provider";
import { builderHeadingTag } from "../../builder/content";
import styles from "../../builder/content.module.css";

export default function InlineHeading({
  host,
  level,
  text,
  caret,
  onFinish,
}: {
  host: HTMLElement;
  level: unknown;
  text: string;
  caret?: number;
  onFinish: (value?: string) => void;
}) {
  const t = useT();
  const editor = useRef<HTMLSpanElement>(null);
  const finished = useRef(false);

  useLayoutEffect(() => {
    const target = editor.current;
    if (!target) return;
    target.textContent = text;
    host.setAttribute("data-editing", "heading");
    target.focus({ preventScroll: true });
    const page = host.ownerDocument;
    const range = page.createRange();
    range.selectNodeContents(target);
    if (target.firstChild)
      range.setStart(
        target.firstChild,
        Math.min(caret ?? text.length, text.length),
      );
    range.collapse(true);
    const selection = page.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return () => host.removeAttribute("data-editing");
  }, [caret, host, text]);

  const finish = (apply: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onFinish(
      apply
        ? (editor.current?.textContent ?? "").replace(/[\r\n]+/g, " ")
        : undefined,
    );
  };

  return createPortal(
    createElement(
      builderHeadingTag(level),
      { className: styles.heading },
      <span
        ref={editor}
        className={styles.inlineHeading}
        contentEditable="plaintext-only"
        data-editor-local-control
        role="textbox"
        aria-label={t("标题文字")}
        aria-multiline={false}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key !== "Enter" && event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          finish(event.key === "Enter");
        }}
      />,
    ),
    host,
  );
}
