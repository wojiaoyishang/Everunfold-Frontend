"use client";
import { useCallback, useEffect } from "react";
import { contentEditHref, readEditAction } from "@/core/content/edit-action";
import type { RequestOptions } from "@/core/http/request";
import { usePageRequest, useReaderData } from "./reader-data";
import { RouteLink } from "./ui/route-link";
import { Icon } from "./icon";
import styles from "./content-edit-link.module.css";

export function ContentEditLink({ contentId }: { contentId: string }) {
  const { store, route } = useReaderData();
  const key = `content:edit:${contentId}`;
  const load = useCallback(
    (options: RequestOptions) =>
      readEditAction(store.baseUrl, contentId, options),
    [store.baseUrl, contentId],
  );
  const result = usePageRequest(key, load);
  useEffect(() => {
    const check = () => {
      if (!document.hidden) store.refreshTask(route, key);
    };
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [store, route, key]);
  const href =
    result?.status === "ready"
      ? contentEditHref(contentId, result.value)
      : null;
  return href ? (
    <RouteLink href={href} className={styles.link} aria-label="编辑这份内容">
      <Icon name="edit" />
      编辑
    </RouteLink>
  ) : null;
}
