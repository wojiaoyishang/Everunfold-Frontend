"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PageValue } from "@/core/contracts/pages";
import { pageDocument, pageRenderId } from "@/core/pages/document";
import styles from "./pages.module.css";

export function PageFrame({
  value,
  onReady,
}: {
  value: PageValue;
  onReady?: () => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(480);
  const [loadedToken, setLoadedToken] = useState("");
  const frameId = useId();
  const { html, css, javascript, javascript_enabled, javascript_position } =
    value;
  const document = useMemo(() => {
    const token = pageRenderId(frameId, {
      html,
      css,
      javascript,
      javascript_enabled,
      javascript_position,
    });
    return {
      token,
      source: pageDocument(
        { html, css, javascript, javascript_enabled, javascript_position },
        token,
      ),
    };
  }, [html, css, javascript, javascript_enabled, javascript_position, frameId]);
  const [ready, setReady] = useState<{
    token: string;
    source: MessageEventSource | null;
  } | null>(null);
  useEffect(() => {
    if (
      ready?.token === document.token &&
      ready.source === ref.current?.contentWindow
    )
      onReady?.();
  }, [ready, document.token, onReady]);
  useEffect(() => {
    const resize = (event: MessageEvent) => {
      if (
        event.source !== ref.current?.contentWindow ||
        event.data?.renderId !== document.token
      )
        return;
      if (event.data.type === "everunfold:page:ready") {
        setReady({ token: document.token, source: event.source });
        return;
      }
      if (event.data.type === "everunfold:page:loaded") {
        setLoadedToken(document.token);
        return;
      }
      if (
        event.data?.type !== "everunfold:page:size" ||
        typeof event.data.height !== "number" ||
        !Number.isFinite(event.data.height)
      )
        return;
      setHeight(Math.min(16000, Math.max(260, event.data.height)));
    };
    window.addEventListener("message", resize);
    ref.current?.contentWindow?.postMessage(
      { type: "everunfold:page:measure" },
      "*",
    );
    return () => window.removeEventListener("message", resize);
  }, [document.token]);
  return (
    <iframe
      key={document.token}
      ref={ref}
      title={value.title}
      className={styles.frame}
      data-anchor-pending={loadedToken !== document.token || undefined}
      style={{ height }}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      srcDoc={document.source}
      onLoad={(event) =>
        event.currentTarget.contentWindow?.postMessage(
          { type: "everunfold:page:measure" },
          "*",
        )
      }
    />
  );
}
