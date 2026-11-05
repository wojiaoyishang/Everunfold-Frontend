"use client";
import { UiText } from "@/core/i18n/provider";

import {
  Button,
  TextField,
  Popover,
} from "@/themes/argon/components/ui/primitives";

import { useEffect, useId, useState } from "react";
import { AppLink as Link } from "./navigation-link";
import { Icon } from "./icon";

export function ArticleActions({
  path,
  title = "篝火旁的故事",
  commentsOpen = true,
}: {
  path: string;
  title?: string;
  commentsOpen?: boolean;
}) {
  const panel = useId();
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [link, setLink] = useState("");
  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [state]);
  async function copyLink() {
    const value = new URL(path, window.location.origin).href;
    setLink(value);
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("manual");
    }
  }
  return (
    <div className="article-actions">
      <span>
        {commentsOpen ? (
          <UiText text="读到这里，想听听你的声音。" />
        ) : (
          <UiText text="把这一刻，分享给在意的人。" />
        )}
      </span>
      <div className="article-action-buttons">
        {commentsOpen && (
          <Link href="#comment-composer">
            <Icon name="comment" />
            <UiText text="写下感想" />
          </Link>
        )}
        <Button
          type="button"
          popoverTarget={panel}
          onClick={() => setLink(new URL(path, window.location.origin).href)}
        >
          <Icon name="send" />
          <UiText text="分享" />
        </Button>
        <Button type="button" onClick={copyLink}>
          <Icon name={state === "copied" ? "check" : "copy"} />
          {state === "copied" ? (
            <UiText text="链接已复制" />
          ) : (
            <UiText text="复制链接" />
          )}
        </Button>
      </div>
      <Popover
        id={panel}
        popover="auto"
        className="share-panel"
        role="dialog"
        aria-label="分享这段故事"
      >
        <header>
          <strong>
            <UiText text="分享这段故事" />
          </strong>
          <Button
            type="button"
            className="icon-button"
            aria-label="关闭分享"
            popoverTarget={panel}
            popoverTargetAction="hide"
          >
            <Icon name="close" />
          </Button>
        </header>
        <p>{title || <UiText text="一则随记" />}</p>
        <label>
          <UiText text="分享链接" />
          <TextField
            readOnly
            aria-label="分享链接"
            value={link}
            onFocus={(event) => event.target.select()}
          />
        </label>
        <div>
          <Button type="button" onClick={copyLink}>
            <Icon name="copy" />
            {state === "copied" ? (
              <UiText text="已复制" />
            ) : (
              <UiText text="复制链接" />
            )}
          </Button>
          <Button
            type="button"
            onClick={async () => {
              if (!navigator.share) {
                await copyLink();
                return;
              }
              try {
                await navigator.share({ title, url: link });
              } catch (error) {
                if (!(
                  error instanceof DOMException && error.name === "AbortError"
                ))
                  setState("manual");
              }
            }}
          >
            <Icon name="external" />
            <UiText text="系统分享" />
          </Button>
        </div>
        <small role="status">
          {state === "manual" ? (
            <UiText text="可以选中上面的链接手动复制。" />
          ) : state === "copied" ? (
            <UiText text="链接已复制，可以粘贴给朋友。" />
          ) : (
            <UiText text="不支持系统分享时，会为你复制链接。" />
          )}
        </small>
      </Popover>
      <span className="sr-only" role="status">
        {state === "copied" ? <UiText text="文章链接已复制" /> : ""}
      </span>
      {state === "manual" && (
        <label className="copy-link-fallback">
          <UiText text="选中链接后复制" />
          <TextField
            aria-label="文章链接"
            readOnly
            value={link}
            onFocus={(event) => event.target.select()}
          />
        </label>
      )}
    </div>
  );
}
