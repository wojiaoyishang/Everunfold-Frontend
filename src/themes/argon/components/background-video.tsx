"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const VIDEO_SOURCE = "/reference/campfire-background.webm";
const PREFERENCE_KEY = "everunfold.background-motion";
const PREFERENCE_EVENT = "everunfold:background-motion";
type PlaybackPreference = "auto" | "playing" | "paused";

interface DataConnection extends EventTarget {
  saveData?: boolean;
}

let memoryPreference: PlaybackPreference = "auto";

function connection(): DataConnection | undefined {
  return (navigator as Navigator & { connection?: DataConnection }).connection;
}

function readPreference(): PlaybackPreference {
  try {
    const saved = window.localStorage.getItem(PREFERENCE_KEY);
    if (saved === "playing" || saved === "paused") return saved;
  } catch {
    // The control remains usable when browser storage is unavailable.
  }
  return memoryPreference;
}

function browserSnapshot(): string {
  return [
    readPreference(),
    Number(window.matchMedia("(prefers-reduced-motion: reduce)").matches),
    Number(Boolean(connection()?.saveData)),
    Number(document.hidden),
  ].join(":");
}

function serverSnapshot(): string {
  // Do not download or autoplay before the browser's motion preferences are known.
  return "unready:1:1:1";
}

function subscribe(callback: () => void): () => void {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const network = connection();
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFERENCE_KEY || event.key === null) {
      memoryPreference = "auto";
      callback();
    }
  };
  reducedMotion.addEventListener("change", callback);
  network?.addEventListener("change", callback);
  document.addEventListener("visibilitychange", callback);
  window.addEventListener("storage", onStorage);
  window.addEventListener(PREFERENCE_EVENT, callback);
  return () => {
    reducedMotion.removeEventListener("change", callback);
    network?.removeEventListener("change", callback);
    document.removeEventListener("visibilitychange", callback);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PREFERENCE_EVENT, callback);
  };
}

function savePreference(preference: PlaybackPreference): void {
  memoryPreference = preference;
  try {
    window.localStorage.setItem(PREFERENCE_KEY, preference);
  } catch {
    // A memory fallback still honors the choice for the current visit.
  }
  window.dispatchEvent(new Event(PREFERENCE_EVENT));
}

export function BackgroundVideo({ poster }: { poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const snapshot = useSyncExternalStore(
    subscribe,
    browserSnapshot,
    serverSnapshot,
  );
  const [preference, reducedMotion, saveData, hidden] = snapshot.split(":");
  const environment = `${reducedMotion}:${saveData}`;
  const automaticMotion = reducedMotion === "0" && saveData === "0";
  // A click can explicitly opt in, but a later OS/network preference change wins.
  const [manualEnvironment, setManualEnvironment] = useState<string | null>(
    null,
  );
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const shouldPlay =
    preference !== "unready" &&
    preference !== "paused" &&
    hidden === "0" &&
    (automaticMotion || manualEnvironment === environment);

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

  function togglePlayback() {
    const video = videoRef.current;
    if (playing) {
      savePreference("paused");
      setManualEnvironment(null);
      video?.pause();
      return;
    }
    setBlocked(false);
    setFailed(false);
    setManualEnvironment(environment);
    savePreference("playing");
    if (!video) return;
    video.muted = true;
    if (!video.getAttribute("src")) video.src = VIDEO_SOURCE;
    if (video.error) video.load();
    // Keep the user-initiated call within the click for restrictive autoplay policies.
    void video.play().catch(() => setBlocked(true));
  }

  const label = playing
    ? "暂停动态背景"
    : failed
      ? "重试动态背景"
      : "播放动态背景";
  const description = playing
    ? "暂停星空背景，保留静态画面"
    : failed
      ? "视频暂时不可用，正在显示静态背景；点击重试"
      : blocked
        ? "浏览器未允许自动播放，点击手动播放背景"
        : !automaticMotion
          ? "已按减少动态效果或节省流量设置使用静态背景；点击可手动播放"
          : "播放星空动态背景";

  return (
    <>
      <div
        className={`page-background${playing ? " is-playing" : ""}`}
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          className={`background-video${playing ? " is-playing" : ""}`}
          poster={poster}
          muted
          autoPlay
          loop
          playsInline
          preload="none"
          tabIndex={-1}
          onPlaying={() => {
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
      <button
        className="background-playback-toggle"
        type="button"
        aria-label={label}
        aria-pressed={playing}
        title={description}
        onClick={togglePlayback}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {playing ? (
            <path d="M8 5v14M16 5v14" />
          ) : (
            <path d="m8 4 12 8-12 8V4Z" />
          )}
        </svg>
        <span className="background-playback-label">
          {playing ? "暂停背景" : "动态背景"}
        </span>
      </button>
    </>
  );
}
