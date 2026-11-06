"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PageValue } from "@/generated/pages-contract";
import { pageDocument } from "@/core/pages/document";
import styles from "./pages.module.css";

export function PageFrame({ value }: { value: PageValue }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(480);
  const document = useMemo(() => pageDocument(value), [value]);
  useEffect(() => {
    const resize = (event: MessageEvent) => {
      if (
        event.source !== ref.current?.contentWindow ||
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
  }, []);
  return (
    <iframe
      ref={ref}
      title={value.title}
      className={styles.frame}
      style={{ height }}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      srcDoc={document}
      onLoad={(event) =>
        event.currentTarget.contentWindow?.postMessage(
          { type: "everunfold:page:measure" },
          "*",
        )
      }
    />
  );
}
