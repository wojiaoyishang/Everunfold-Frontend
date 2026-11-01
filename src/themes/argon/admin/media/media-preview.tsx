"use client";
import { useRef, useState } from "react";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
/** Shared thumbnail/player. Media originals are never injected as HTML. */
export function MediaPreview({
  url,
  kind,
  label,
  playable = false,
  deleted = false,
}: {
  url: string;
  kind: "image" | "video" | "file";
  deleted?: boolean;
  label: string;
  playable?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const safe = /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url);
  return (
    <div className={`admin-media-preview admin-media-preview-${kind}`}>
      {deleted || kind === "file" ? (
        <span className="admin-media-file-placeholder">
          <Icon name={deleted ? "archive" : "book"} />
          <span>
            {deleted
              ? "已放入回收站"
              : label.split(".").pop()?.toUpperCase().slice(0, 12) || "FILE"}
          </span>
        </span>
      ) : safe && !failed ? (
        kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- User-selected media and remote Base URL.
          <img
            src={url}
            alt={label}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : playable ? (
          <video
            ref={video}
            src={url}
            muted
            loop
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
          />
        ) : (
          <Icon name="play" />
        )
      ) : (
        <span className="admin-media-preview-missing">
          <Icon name="image" />
          {safe ? "暂时无法预览" : "预览"}
        </span>
      )}
      {kind === "video" && playable && safe && !failed && !deleted && (
        <Button
          className="admin-media-play"
          aria-label={playing ? "暂停视频预览" : "播放视频预览"}
          onClick={() => {
            if (playing) video.current?.pause();
            else void video.current?.play().catch(() => setFailed(true));
          }}
        >
          <Icon name={playing ? "pause" : "play"} />
          <span>{playing ? "暂停" : "静音预览"}</span>
        </Button>
      )}
    </div>
  );
}
