"use client";
import { useEffect, useRef } from "react";
/** An authorized editor sends only its display projection, never password fields or persisted browser data. */
export function useEmbeddedPreviewPublisher(
  id: string | null,
  payload: object | null,
) {
  const latest = useRef(payload);
  const serialized = JSON.stringify(payload);
  useEffect(() => {
    latest.current = payload;
  }, [payload]);
  useEffect(() => {
    if (
      !id ||
      window.parent === window ||
      !window.name.startsWith("everunfold-live-editor")
    )
      return;
    const send = () => {
      if (latest.current)
        window.parent.postMessage(latest.current, window.location.origin);
    };
    const request = (event: MessageEvent) => {
      if (
        event.source === window.parent &&
        event.origin === window.location.origin &&
        event.data?.type === "everunfold:request-preview" &&
        event.data.id === id
      )
        send();
    };
    window.addEventListener("message", request);
    const timer = window.setTimeout(send, 180);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", request);
    };
  }, [id, serialized]);
}
