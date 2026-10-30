"use client";

import { useEffect, useState } from "react";
import { AppLink as Link } from "./navigation-link";
import { Icon } from "./icon";

export function ArticleActions({ path }: { path: string }) {
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
      <span>读到这里，想听听你的声音。</span>
      <div>
        <Link href="#comment-composer">
          <Icon name="comment" />
          写下感想
        </Link>
        <button type="button" onClick={copyLink}>
          <Icon name={state === "copied" ? "check" : "copy"} />
          {state === "copied" ? "链接已复制" : "复制链接"}
        </button>
      </div>
      <span className="navigation-status" role="status">
        {state === "copied" ? "文章链接已复制" : ""}
      </span>
      {state === "manual" && (
        <label className="copy-link-fallback">
          选中链接后复制
          <input
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
