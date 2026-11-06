"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Site } from "@/core/content/types";
import type { PublicManagedPage } from "@/core/contracts/pages";
import { readManagedPage } from "@/core/contracts/pages";
import { useAdminRequest } from "@/core/admin/account-context";
import { checkedPreviewPage } from "@/core/pages/preview-validation";
import { pagesFailure } from "@/core/pages/failure";
import { hasPageImplementation } from "@/core/pages/registry";
import { UiText } from "@/core/i18n/provider";
import { BlogShell } from "../components/shell";
import { ManagedPageView } from "../pages/view";
import { Button } from "../components/ui/primitives";
import styles from "./content-preview.module.css";
import { previewStamp } from "@/core/preview/bridge";
import { usePreviewReceipt } from "@/core/preview/use-preview-receipt";

export function ManagedPagePreview({
  id,
  site,
}: {
  id: string;
  site: Site | null;
}) {
  const { baseUrl } = useAdminRequest();
  const router = useRouter();
  const [page, setPage] = useState<PublicManagedPage | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { setStamp, rendered } = usePreviewReceipt(id);
  useEffect(() => {
    const controller = new AbortController();
    let received = false;
    const parentWindow =
      window.parent === window
        ? (window.opener as Window | null)
        : window.parent;
    const receive = (event: MessageEvent) => {
      if (
        !parentWindow ||
        event.source !== parentWindow ||
        event.origin !== window.location.origin ||
        event.data?.type !== "everunfold:page-preview"
      )
        return;
      const next = checkedPreviewPage(event.data.page, id);
      if (!next) return;
      const stamp = previewStamp(event.data);
      if (window.parent !== window && !stamp) return;
      received = true;
      setStamp(stamp);
      setPage(next);
      setLive(true);
      setError("");
    };
    window.addEventListener("message", receive);
    if (parentWindow)
      parentWindow.postMessage(
        { type: "everunfold:page-preview-ready", id },
        window.location.origin,
      );
    void readManagedPage(baseUrl, id, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted && !received)
          setPage({
            ...response.data.value,
            id,
            source: response.data.source,
            implementation_id: response.data.implementation_id,
            implementation_version: response.data.registration?.version,
            revision: response.data.revision,
            enabled: true,
          });
      })
      .catch((failure) => {
        if (!controller.signal.aborted && !received)
          setError(pagesFailure(failure));
      });
    return () => {
      controller.abort();
      window.removeEventListener("message", receive);
    };
  }, [baseUrl, id, attempt, setStamp]);
  if (!site)
    return (
      <main className="admin-root admin-access" data-surface="admin">
        <section className="admin-access-card">
          <h1>
            <UiText text="前台样式暂不可用" />
          </h1>
          <p>
            <UiText text="站点公开配置尚未就绪，请返回编辑页，稍后重新打开预览。" />
          </p>
        </section>
      </main>
    );
  return (
    <BlogShell site={site} backendBaseUrl={baseUrl}>
      <section className={`surface ${styles.bar}`}>
        <strong>
          <UiText text="页面预览" /> ·{" "}
          <UiText text={live ? "编辑器输入" : "已保存草稿"} />
        </strong>
        <div className={styles.actions}>
          <Button
            className={styles.button}
            onClick={() => setAttempt((value) => value + 1)}
          >
            <UiText text="刷新预览" />
          </Button>
          <Button
            className={styles.button}
            onClick={() => {
              if (window.parent !== window) {
                window.parent.postMessage(
                  { type: "everunfold:focus-editor", id },
                  window.location.origin,
                );
                return;
              }
              if (window.opener && !window.opener.closed) {
                window.opener.focus();
                window.close();
                return;
              }
              router.push(`/admin/pages/${id}`);
            }}
          >
            <UiText text="返回编辑" />
          </Button>
        </div>
      </section>
      <p className={styles.notice}>
        <UiText text="仅有页面权限的用户可查看；预览不会启用页面，修改仅保留在编辑器中。" />
      </p>
      {error ? (
        <section className={`surface ${styles.state}`} role="alert">
          {error}
        </section>
      ) : page ? (
        hasPageImplementation(page) ? (
          <ManagedPageView page={page} onReady={rendered} />
        ) : (
          <section className={`surface ${styles.state}`} role="alert">
            <UiText text="页面实现尚未安装，配置已保留。" />
          </section>
        )
      ) : (
        <section className={`surface ${styles.state}`} role="status">
          <UiText text="正在等待编辑器的预览内容…" />
        </section>
      )}
    </BlogShell>
  );
}
