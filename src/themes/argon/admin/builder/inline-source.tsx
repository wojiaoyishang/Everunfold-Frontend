"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MediaURL } from "@/core/contracts/content-admin";
import type { PublicShortcode } from "@/core/contracts/settings";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { BuilderSource } from "../../builder/content";
import { BuilderBlockSourceEditor } from "./block-source-editor";
import { isBuilderPreviewControl } from "./preview-controls";
import styles from "../../builder/content.module.css";

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
  onFinish: (value?: string, media?: Record<string, MediaURL>) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState(source);
  const latest = useRef(source);
  const applied = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const [modeControls, setModeControls] = useState<HTMLDivElement | null>(null);
  const [picked, setPicked] = useState<Record<string, MediaURL>>({});
  const mediaUrls = { ...media, ...picked };
  const output = host.parentElement?.querySelector(
    "[data-builder-inline-output]",
  );
  const update = (next: string) => {
    latest.current = next;
    setDraft(next);
  };
  const finish = (apply: boolean) => {
    if (applied.current) return;
    applied.current = true;
    if (apply)
      onFinish(latest.current, Object.keys(picked).length ? picked : undefined);
    else onFinish();
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
      const target = event.target as Element | null;
      if (
        target &&
        target !== frameDocument.defaultView?.frameElement &&
        !host.contains(target) &&
        !(
          host.parentElement?.contains(target) &&
          isBuilderPreviewControl(target)
        ) &&
        !target.closest?.("dialog:modal")
      )
        applyAfterInput();
    };
    // The shared block editor can open native modal pickers in the workspace.
    frameDocument.addEventListener("pointerdown", outside, true);
    topDocument?.addEventListener("pointerdown", outside, true);
    host.addEventListener("compositionstart", startComposition, true);
    host.addEventListener("compositionend", endComposition, true);
    frameDocument.addEventListener("focusin", outside);
    topDocument?.addEventListener("focusin", outside);
    return () => {
      host.removeAttribute("data-editing");
      if (deferred !== null) clearTimeout(deferred);
      host.removeEventListener("compositionstart", startComposition, true);
      host.removeEventListener("compositionend", endComposition, true);
      frameDocument.removeEventListener("focusin", outside);
      topDocument?.removeEventListener("focusin", outside);
      frameDocument.removeEventListener("pointerdown", outside, true);
      topDocument?.removeEventListener("pointerdown", outside, true);
    };
  }, [host]);
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const reveal = () => {
      if (
        element.getBoundingClientRect().bottom >
        host.ownerDocument.documentElement.clientHeight
      )
        element.scrollIntoView({ block: "nearest", behavior: "instant" });
    };
    const observer = new ResizeObserver(reveal);
    observer.observe(element);
    return () => observer.disconnect();
  }, [host]);
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
              context={{ media: mediaUrls, shortcodes }}
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
          className={`admin-root ${styles.inlineEditor}`}
          data-editor-local-control
          onKeyDown={(event) => {
            if (
              event.defaultPrevented ||
              event.nativeEvent.isComposing ||
              !event.currentTarget.contains(event.target as Node)
            )
              return;
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
          <div className={styles.inlineEditorActions}>
            <div ref={setModeControls} />
            <div>
              <Button
                className="admin-icon-button"
                title={t("应用到组件")}
                aria-label={t("应用到组件")}
                onClick={() => finish(true)}
              >
                <Icon name="check" />
              </Button>
              <Button
                className="admin-icon-button"
                title={t("取消")}
                aria-label={t("取消")}
                onClick={() => finish(false)}
              >
                <Icon name="close" />
              </Button>
            </div>
          </div>
          <div className={styles.inlineBlockEditor}>
            <BuilderBlockSourceEditor
              format={format}
              label={t(label)}
              value={draft}
              onChange={update}
              media={mediaUrls}
              onMedia={(item) =>
                setPicked((current) => ({
                  ...current,
                  [item.id.replace(/^media:/, "")]: { original: item.url },
                }))
              }
              modeControls={modeControls}
              autoFocus
            />
          </div>
        </div>,
        host,
      )}
    </>
  );
}
