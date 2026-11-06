"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicManagedPage } from "@/core/contracts/pages";
import { managedPagePreviewPath } from "./preview";
/** Unsaved page previews use exact owned windows and never persist draft source in a URL or browser store. */
export function usePagePreview(page: PublicManagedPage) {
  const popup = useRef<Window | null>(null),
    latest = useRef(page);
  const [error, setError] = useState("");
  useEffect(() => {
    latest.current = page;
  }, [page]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === popup.current &&
        event.data?.type === "everunfold:page-preview-ready" &&
        event.data.id === page.id
      )
        popup.current?.postMessage(
          { type: "everunfold:page-preview", page: latest.current },
          window.location.origin,
        );
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [page.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (popup.current && !popup.current.closed)
        popup.current.postMessage(
          { type: "everunfold:page-preview", page },
          window.location.origin,
        );
    }, 180);
    return () => window.clearTimeout(timer);
  }, [page]);
  const openWindow = () => {
    const target = window.open(
      managedPagePreviewPath(page.id),
      `everunfold-page-preview-${page.id}`,
    );
    popup.current = target;
    setError(target ? "" : "预览窗口被浏览器拦截，请允许弹出窗口后重试。");
    if (target) {
      target.focus();
      target.postMessage(
        { type: "everunfold:page-preview", page },
        window.location.origin,
      );
    }
  };
  return { openWindow, error };
}
