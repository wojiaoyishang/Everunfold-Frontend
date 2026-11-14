"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useEditorState, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { htmlRichSource } from "@/core/editor/visual-document";
import { markdownRichSource } from "@/core/editor/visual-markdown";
import type { MediaURL } from "@/core/contracts/content-admin";
import type { PublicShortcode } from "@/core/contracts/settings";
import { UiText, useT } from "@/core/i18n/provider";
import { Button, TextArea } from "../../components/ui/primitives";
import { RichTextEditor } from "../../components/ui/rich-text-editor";
import { Icon, type IconName } from "../../components/icon";
import { BuilderSource } from "../../builder/content";
import styles from "../../builder/content.module.css";

const sourceOnlyNodes = new Set(["rawHtml", "htmlOpaque", "nativeShortcode"]);
function needsSource(node: JSONContent): boolean {
  return (
    sourceOnlyNodes.has(node.type ?? "") ||
    Boolean(node.content?.some(needsSource))
  );
}

function canEditVisually(value: string, format: "html" | "markdown") {
  try {
    return !needsSource(
      format === "markdown" ? markdownRichSource(value) : htmlRichSource(value),
    );
  } catch {
    return false;
  }
}

export default function InlineSource({
  id,
  host,
  source,
  format,
  media,
  shortcodes,
  onFinish,
}: {
  id: string;
  host: HTMLElement;
  source: string;
  format: "html" | "markdown";
  media?: Record<string, MediaURL>;
  shortcodes?: readonly PublicShortcode[];
  onFinish: (value?: string) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState(source);
  const latest = useRef(source);
  const applied = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [raw, setSourceMode] = useState(() => !canEditVisually(source, format));
  const canSwitchToVisual = useMemo(
    () => !raw || canEditVisually(draft, format),
    [raw, draft, format],
  );
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  const output = host.parentElement?.querySelector(
    "[data-builder-inline-output]",
  );
  const initialSelection = useMemo(() => ({ start: 0, end: 0 }), []);
  const update = (next: string) => {
    latest.current = next;
    setDraft(next);
  };
  const finish = (apply: boolean) => {
    if (applied.current) return;
    applied.current = true;
    onFinish(apply ? latest.current : undefined);
  };
  const leave = useEffectEvent(() => finish(true));
  useEffect(() => {
    host.setAttribute("data-editing", "source");
    const frameDocument = host.ownerDocument;
    const topDocument = frameDocument.defaultView?.frameElement?.ownerDocument;
    let composing = false;
    let deferred: ReturnType<typeof setTimeout> | null = null;
    const startComposition = () => {
      composing = true;
    };
    const endComposition = () => {
      composing = false;
    };
    const applyAfterInput = () => {
      if (deferred !== null) return;
      if (composing) deferred = setTimeout(leave, 0);
      else leave();
    };
    const outside = (event: Event) => {
      if (event.target && !host.contains(event.target as Node))
        applyAfterInput();
    };
    // Pointer events commit before the next canvas selection or admin action.
    frameDocument.addEventListener("pointerdown", outside, true);
    topDocument?.addEventListener("pointerdown", outside, true);
    const focus = (event: FocusEvent) => {
      if (
        event.target &&
        event.target !== frameDocument.defaultView?.frameElement &&
        !host.contains(event.target as Node)
      )
        applyAfterInput();
    };
    host.addEventListener("compositionstart", startComposition, true);
    host.addEventListener("compositionend", endComposition, true);
    frameDocument.addEventListener("focusin", focus);
    topDocument?.addEventListener("focusin", focus);
    return () => {
      host.removeAttribute("data-editing");
      if (deferred !== null) clearTimeout(deferred);
      host.removeEventListener("compositionstart", startComposition, true);
      host.removeEventListener("compositionend", endComposition, true);
      frameDocument.removeEventListener("focusin", focus);
      topDocument?.removeEventListener("focusin", focus);
      frameDocument.removeEventListener("pointerdown", outside, true);
      topDocument?.removeEventListener("pointerdown", outside, true);
    };
  }, [host]);
  useEffect(() => {
    if (raw) textarea.current?.focus({ preventScroll: true });
    const element = panel.current;
    if (
      element &&
      element.getBoundingClientRect().bottom >
        host.ownerDocument.documentElement.clientHeight
    )
      element.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [host, raw]);
  const label = format === "html" ? "编辑 HTML" : "编辑 Markdown";
  return (
    <>
      {output &&
        draft !== source &&
        createPortal(
          draft ? (
            <BuilderSource
              id={id}
              source={draft}
              format={format}
              context={{ media, shortcodes }}
              preview
            />
          ) : (
            <span className={styles.placeholder}>
              <UiText text={format === "html" ? "HTML" : "Markdown"} />
            </span>
          ),
          output,
        )}
      {createPortal(
        <div
          ref={panel}
          className={styles.inlineEditor}
          data-editor-local-control
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (
              event.key === "Escape" ||
              (event.key === "Enter" && (event.ctrlKey || event.metaKey))
            ) {
              event.preventDefault();
              event.stopPropagation();
              finish(event.key !== "Escape");
            }
          }}
        >
          <div
            className={styles.inlineToolbar}
            role="toolbar"
            aria-label={t("排版工具")}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse") event.preventDefault();
            }}
          >
            <div className={styles.inlineMarks} ref={setToolbar} />
            {canSwitchToVisual && (
              <InlineButton
                label={raw ? "可视化" : "源码"}
                icon={raw ? "type" : "code"}
                onClick={() => setSourceMode(!raw)}
                active={raw}
              />
            )}
            <InlineButton
              label="应用到组件"
              icon="check"
              onClick={() => finish(true)}
            />
            <InlineButton
              label="取消"
              icon="close"
              onClick={() => finish(false)}
            />
          </div>
          {raw ? (
            <TextArea
              ref={textarea}
              className={styles.inlineSource}
              value={draft}
              spellCheck={false}
              rows={Math.min(12, Math.max(4, draft.split("\n").length))}
              aria-label={t(label + " 源码")}
              onChange={(event) => update(event.target.value)}
            />
          ) : (
            <div className={`article-content ${styles.inlineBody}`}>
              <RichTextEditor
                value={draft}
                onChange={update}
                label={t(label)}
                disabled={false}
                format={format}
                media={media}
                initialSelection={initialSelection}
                toolbarTarget={toolbar}
                hideStatusBar
                toolbar={(editor) => <InlineMarks editor={editor} />}
              />
            </div>
          )}
        </div>,
        host,
      )}
    </>
  );
}

function InlineMarks({ editor }: { editor: Editor }) {
  useLayoutEffect(() => {
    if (!editor.isDestroyed) editor.view.updateRoot();
  }, [editor]);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      bullet: editor.isActive("bulletList"),
      quote: editor.isActive("blockquote"),
    }),
  });
  return (
    <>
      <InlineButton
        label="加粗"
        icon="bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <InlineButton
        label="斜体"
        icon="italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <InlineButton
        label="删除线"
        icon="strike"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <InlineButton
        label="行内代码"
        icon="code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <InlineButton
        label="无序列表"
        icon="list"
        active={state.bullet}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <InlineButton
        label="引用"
        icon="quote"
        active={state.quote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
    </>
  );
}

function InlineButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: IconName;
  active?: boolean;
  onClick: () => void;
}) {
  const t = useT();
  return (
    <Button
      className={styles.inlineButton}
      title={t(label)}
      aria-label={t(label)}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon name={icon} />
      <span className={styles.inlineButtonText}>
        <UiText text={label} />
      </span>
    </Button>
  );
}
