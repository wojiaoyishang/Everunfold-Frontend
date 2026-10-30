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

const VIDEO_SOURCE = "/reference/campfire-background.webm";
function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}
const PlaybackContext = createContext<{
  playing: boolean;
  label: string;
  description: string;
  togglePlayback: () => void;
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
  children,
}: {
  poster: string;
  children: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const motion = useMotion();
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => false,
  );
  // A pause lasts for the current mounted visit, including soft navigation. Reload starts playing.
  const [pausedByUser, setPausedByUser] = useState(false);
  const [manualEnvironment, setManualEnvironment] = useState<string | null>(
    null,
  );
  const [playing, setPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const environment = `${motion.preference}:${motion.enabled}`;
  const shouldPlay =
    visible &&
    !pausedByUser &&
    (motion.enabled || manualEnvironment === environment);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!shouldPlay) {
      video.pause();
      return;
    }
    video.muted = true;
    if (!video.getAttribute("src")) {
      video.src = VIDEO_SOURCE;
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
  }, [shouldPlay]);

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

  function togglePlayback() {
    const video = videoRef.current;
    if (playing) {
      setPausedByUser(true);
      setManualEnvironment(null);
      video?.pause();
      return;
    }
    setPausedByUser(false);
    setBlocked(false);
    setFailed(false);
    setManualEnvironment(environment);
    if (!video) return;
    video.muted = true;
    if (!video.getAttribute("src")) video.src = VIDEO_SOURCE;
    if (video.error) video.load();
    void video.play().catch(() => setBlocked(true));
  }

  const label = playing
    ? "暂停动态背景"
    : failed
      ? "重试动态背景"
      : "播放动态背景";
  const description = playing
    ? "暂停星空背景，保留当前画面"
    : failed
      ? "视频暂时不可用，点击重试"
      : blocked
        ? "浏览器暂未允许自动播放，点击播放背景"
        : !motion.enabled
          ? "当前为减少动态模式，也可单独播放背景"
          : "播放星空动态背景";
  return (
    <PlaybackContext.Provider
      value={{ playing, label, description, togglePlayback }}
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
