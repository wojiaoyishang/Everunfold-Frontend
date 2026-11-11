"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PageValue } from "@/core/contracts/pages";
import { pageDocument, pageRenderId } from "@/core/pages/document";
import {
  ImageViewer,
  type GalleryImage,
} from "../components/reader/image-viewer";
import styles from "./pages.module.css";
import { usePageImageViewer } from "./image-viewer-boundary";

export function PageFrame({
  value,
  onReady,
}: {
  value: PageValue;
  onReady?: () => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const imageViewer = usePageImageViewer();
  const [height, setHeight] = useState(480);
  const [gallery, setGallery] = useState<{
    index: number;
    items: GalleryImage[];
  } | null>(null);
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
      if (event.data.type === "everunfold:page:image") {
        if (
          !imageViewer.enabled ||
          !Array.isArray(event.data.items) ||
          !Number.isSafeInteger(event.data.index)
        )
          return;
        const items = event.data.items
          .filter(
            (item: unknown): item is GalleryImage =>
              typeof item === "object" &&
              item !== null &&
              typeof (item as GalleryImage).src === "string" &&
              typeof (item as GalleryImage).caption === "string",
          )
          .slice(0, 100);
        if (!items.length) return;
        setGallery({
          index: Math.max(0, Math.min(items.length - 1, event.data.index)),
          items,
        });
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
  }, [document.token, imageViewer.enabled]);
  return (
    <>
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
      {gallery && (
        <ImageViewer
          items={gallery.items}
          initialIndex={gallery.index}
          onDismiss={() => setGallery(null)}
        />
      )}
    </>
  );
}
