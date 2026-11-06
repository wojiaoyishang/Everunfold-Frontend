"use client";
import { useEffect, useState } from "react";
import { useMotion } from "../hooks/use-motion";
import { Icon, type IconName } from "./icon";

/** Preload before the check/reveal; keyed by account + URL, never by reader refresh. */
export function BackendStatusAvatar({
  src,
  settled,
  fallback,
  warning,
}: {
  src: string;
  settled: boolean;
  fallback: IconName;
  warning: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finished, setFinished] = useState(false);
  const { enabled } = useMotion();
  const stage =
    loaded && !failed
      ? finished || !enabled
        ? "avatar"
        : settled
          ? "check"
          : "cloud"
      : "cloud";
  useEffect(() => {
    if (stage !== "check") return;
    // Canceled CSS animations and missing animation events must not trap the icon.
    const timer = setTimeout(() => setFinished(true), 900);
    return () => clearTimeout(timer);
  }, [stage]);
  return (
    <span
      className="backend-status-visual"
      data-stage={stage}
      aria-hidden="true"
    >
      <span className="backend-status-cloud">
        <Icon name={fallback} />
      </span>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="backend-status-avatar-image"
          src={src}
          alt=""
          width={30}
          height={30}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {stage === "check" && (
        <span
          className="backend-status-ready-mark"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setFinished(true);
          }}
        >
          <Icon name="check" />
        </span>
      )}
      {stage === "avatar" && warning && (
        <span className="backend-status-warning">
          <Icon name="cloud-off" />
        </span>
      )}
    </span>
  );
}
