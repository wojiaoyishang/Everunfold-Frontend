"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useMotion } from "../hooks/use-motion";
import { resolvePlayback } from "@/core/browser/playback-policy";
import {
  readPlaybackPreference,
  setPlaybackPreference,
  subscribePlaybackPreference,
} from "@/core/browser/playback-preference";

const VIDEO_SOURCE = "/reference/campfire-background.webm";
function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}
const PlaybackContext = createContext<{
  playing: boolean;
  enabled: boolean;
  description: string;
  needsRetry: boolean;
  setEnabled: (enabled: boolean) => void;
  reset: () => void;
} | null>(null);

export function useBackgroundPlayback() {
  const value = useContext(PlaybackContext);
  if (!value)
    throw new Error(
      "Background controls require the persistent video provider",
    );
  return value;
}

export function BackgroundVideoProvider({
  poster,
  source = VIDEO_SOURCE,
  defaultPlay = true,
  children,
}: {
  poster: string;
  source?: string;
  defaultPlay?: boolean;
  children: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const motion = useMotion();
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => false,
  );
  const preference = useSyncExternalStore(
    subscribePlaybackPreference,
    readPlaybackPreference,
    () => "auto" as const,
  );
  const [playing, setPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const enabled =
    Boolean(source) &&
    (preference === "auto" && !defaultPlay
      ? false
      : resolvePlayback(preference, motion.enabled));
  const shouldPlay = visible && enabled;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!shouldPlay) {
      video.pause();
      return;
    }
    video.muted = true;
    if (!video.getAttribute("src")) {
      video.src = source;
      video.load();
    }
    let cancelled = false;
    void video.play().catch(() => {
      if (!cancelled) setBlocked(true);
    });
    return () => {
      cancelled = true;
      video.pause();
    };
  }, [shouldPlay, source]);

  useEffect(() => {
    if (!blocked || !shouldPlay) return;
    const retry = () => {
      void videoRef.current?.play().catch(() => {
        /* Keep the visible retry control. */
      });
    };
    window.addEventListener("pointerdown", retry, { once: true });
    return () => window.removeEventListener("pointerdown", retry);
  }, [blocked, shouldPlay]);

  function setEnabled(value: boolean) {
    const video = videoRef.current;
    setPlaybackPreference(value ? "play" : "pause");
    if (!value) {
      video?.pause();
      return;
    }
    setBlocked(false);
    setFailed(false);
    if (!video) return;
    video.muted = true;
    if (!video.getAttribute("src")) video.src = source;
    if (video.error) video.load();
    void video.play().catch(() => setBlocked(true));
  }

  const description = playing
    ? "星空正在播放，离开标签时自动暂停"
    : failed
      ? "视频暂时不可用，点击重试"
      : blocked
        ? "浏览器暂未允许播放，点击重试"
        : !enabled
          ? "已使用静态背景，可随时开启"
          : "进入页面时自动播放星空背景";
  return (
    <PlaybackContext.Provider
      value={{
        playing,
        enabled,
        description,
        needsRetry: enabled && (blocked || failed),
        setEnabled,
        reset: () => setPlaybackPreference("auto"),
      }}
    >
      <div
        className={`page-background${playing ? " is-playing" : ""}`}
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          className={`background-video${hasFrame && !failed ? " is-visible" : ""}`}
          poster={poster}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          onPlaying={() => {
            setHasFrame(true);
            setPlaying(true);
            setBlocked(false);
            setFailed(false);
          }}
          onPause={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setFailed(true);
          }}
        />
      </div>
      {children}
    </PlaybackContext.Provider>
  );
}
