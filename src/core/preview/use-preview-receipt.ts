"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { samePreview, type PreviewStamp } from "./bridge";

/** Acknowledge the current rendered projection after paint, never an older queued revision. */
export function usePreviewReceipt(id: string) {
  const [stamp, setStamp] = useState<PreviewStamp | null>(null);
  const current = useRef(stamp);
  const frames = useRef<number[]>([]);
  useLayoutEffect(() => {
    current.current = stamp;
    return () => {
      frames.current.forEach(cancelAnimationFrame);
      frames.current = [];
    };
  }, [stamp]);
  useEffect(() => () => frames.current.forEach(cancelAnimationFrame), []);
  const rendered = useCallback(() => {
    if (!stamp || window.parent === window) return;
    frames.current.push(
      requestAnimationFrame(() => {
        frames.current.push(
          requestAnimationFrame(() => {
            if (samePreview(current.current, stamp))
              window.parent.postMessage(
                {
                  type: "everunfold:preview-applied",
                  id,
                  ...stamp,
                },
                window.location.origin,
              );
          }),
        );
      }),
    );
  }, [id, stamp]);
  return { stamp, setStamp, rendered };
}
