"use client";

import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  readTemplateImpact,
  type TemplateImpact,
} from "@/core/contracts/pages";
import { UiText, useT } from "@/core/i18n/provider";
import { pagesFailure } from "@/core/pages/failure";
import styles from "./versions.module.css";

export function useTemplateImpact(id: string | undefined) {
  const { baseUrl } = useAdminRequest();
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<{
    id: string;
    request: number;
    data?: TemplateImpact;
    error?: string;
  }>();
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void readTemplateImpact(baseUrl, id, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ id, request, data });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setResult({ id, request, error: pagesFailure(cause) });
      });
    return () => controller.abort();
  }, [baseUrl, id, request]);
  const current =
    id && result?.id === id && result.request === request ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    reload: () => setRequest((attempt) => attempt + 1),
  };
}

export function TemplateImpactList({ impact }: { impact?: TemplateImpact }) {
  const t = useT();
  if (!impact)
    return (
      <p role="status">
        <UiText text="正在查看受影响的页面…" />
      </p>
    );
  if (!impact.pages.length)
    return (
      <p>
        <UiText text="目前没有页面使用此模板。" />
      </p>
    );
  return (
    <>
      <p>{t("受影响的页面（{count}）", { count: impact.pages.length })}</p>
      <ul
        className={styles.impactList}
        aria-label={t("受影响的页面")}
        tabIndex={0}
      >
        {impact.pages.map((page) => (
          <li key={page.id}>
            <div>
              <strong>{page.title}</strong>
              <small>
                {page.path}
                {page.language ? ` · ${page.language.toUpperCase()}` : ""}
              </small>
            </div>
            <span className="admin-badge">
              <UiText text={page.published ? "已发布" : "未发布"} />
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
