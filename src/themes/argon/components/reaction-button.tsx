"use client";
import { useEffect, useState } from "react";
import { Icon } from "./icon";

const previews = new Set<string>();
/** Preview-only reaction, shared between card and detail in this browser tab. */
export function ReactionButton({
  id,
  count = 0,
}: {
  id: string;
  count?: number;
}) {
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLiked(previews.has(id)));
    return () => cancelAnimationFrame(frame);
  }, [id]);
  return (
    <button
      className="reaction-button"
      aria-pressed={liked}
      title="本次浏览的互动预览，不会提交到网站"
      onClick={() => {
        const next = !liked;
        if (next) previews.add(id);
        else previews.delete(id);
        setLiked(next);
      }}
    >
      <Icon name="heart" />
      {count + Number(liked) || "喜欢"}
      <span className="sr-only">（互动预览）</span>
    </button>
  );
}
