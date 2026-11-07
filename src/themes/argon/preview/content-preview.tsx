"use client";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useMemo, useState } from "react";
import type { Content, Site, Taxonomy } from "@/core/content/types";
import { checkedLiveContent } from "@/core/preview/content";
import { previewContent } from "@/core/content-management/preview";
import { useContentPreview } from "@/core/content-management/use-content-preview";
import { presentLegacyContent } from "@/core/content/presentation";
import { renderContent } from "@/core/rendering/content";
import { BlogShell } from "../components/shell";
import { ExtensionComponent } from "@/core/extensions/components";
import { ThemeTemplate } from "@/core/themes/presentation";
import { PagePresentation } from "../components/route-state";
import { Button } from "../components/ui/primitives";
import { RouteLink } from "../components/ui/route-link";
import { Icon } from "../components/icon";
import styles from "./content-preview.module.css";
import { previewStamp } from "@/core/preview/bridge";
import { usePreviewReceipt } from "@/core/preview/use-preview-receipt";

export function ContentPreview({
  type,
  id,
  site,
  terms,
}: {
  type: string;
  id: string;
  site: Site | null;
  terms: Taxonomy[];
}) {
  const runtime = usePluginRuntime();
  const { detail, error, baseUrl, retry } = useContentPreview(type, id);
  const [liveContent, setLiveContent] = useState<Content | null>(null);
  const { setStamp, rendered } = usePreviewReceipt(id);
  useEffect(() => {
    if (window.parent === window) return;
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "everunfold:content-preview"
      )
        return;
      const value = checkedLiveContent(event.data.content, type, id);
      const stamp = previewStamp(event.data);
      if (value && stamp) {
        setStamp(stamp);
        setLiveContent(value);
      }
    };
    window.addEventListener("message", receive);
    window.parent.postMessage(
      { type: "everunfold:content-preview-ready", id },
      window.location.origin,
    );
    return () => window.removeEventListener("message", receive);
  }, [type, id, setStamp]);
  const presentation = useMemo(() => {
    void runtime.catalog?.revision;
    if (!detail) return null;
    const content = liveContent ?? previewContent(detail, terms);
    return {
      content,
      rendered: renderContent(content, site?.settings?.shortcodes),
    };
  }, [
    detail,
    liveContent,
    terms,
    site?.settings?.shortcodes,
    runtime.catalog?.revision,
  ]);
  useEffect(() => {
    if (presentation && liveContent) rendered();
  }, [presentation, liveContent, rendered]);
  const back = `/admin/content/${type}/${id}/edit`;
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
          <RouteLink className="admin-button" href={back}>
            <UiText text="返回编辑" />
          </RouteLink>
        </section>
      </main>
    );
  return (
    <BlogShell site={site} backendBaseUrl={baseUrl}>
      <section className={`surface ${styles.bar}`} aria-label="前台预览操作">
        <div className={styles.label}>
          <Icon name="eye" />
          <div className={styles.details}>
            <strong>
              <UiText text="前台预览" />
            </strong>
            <span>
              {detail ? (
                `草稿 · 修订 ${detail.revision}`
              ) : error ? (
                <UiText text="读取失败" />
              ) : (
                <UiText text="正在读取草稿" />
              )}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            className={styles.button}
            disabled={!detail && !error}
            onClick={retry}
          >
            <Icon name="refresh" />
            <UiText text="刷新预览" />
          </Button>
          <RouteLink
            className={styles.button}
            href={back}
            onClick={(event) => {
              if (window.parent !== window) {
                event.preventDefault();
                window.parent.postMessage(
                  { type: "everunfold:focus-editor", id },
                  window.location.origin,
                );
              }
            }}
          >
            <Icon name="edit" />
            <UiText text="返回编辑" />
          </RouteLink>
        </div>
      </section>
      <p className={styles.notice}>
        <UiText text="仅有编辑权限的用户可查看；预览不会发布内容，也不提交浏览、点赞或评论。" />
      </p>
      {error ? (
        <section className={`surface ${styles.state}`} role="alert">
          <Icon name="cloud-off" />
          <h1>
            <UiText text="无法预览这份内容" />
          </h1>
          <p>{error}</p>
          <Button className={styles.button} onClick={retry}>
            <UiText text="重新读取" />
          </Button>
        </section>
      ) : presentation ? (
        <>
          <PagePresentation
            site={site}
            id={presentation.content.id}
            toc={presentation.rendered.toc}
          />
          <ThemeTemplate
            name={type === "shuoshuo" ? "shuoshuo" : "article"}
            context={{
              site,
              content: presentation.content,
              path: presentation.content.path,
              preview: true,
            }}
          >
            {type === "shuoshuo" ? (
              <ExtensionComponent
                name="public.shuoshuo.card"
                entry={{
                  content: presentLegacyContent(presentation.content),
                  example: false,
                }}
                detail
                rendered={presentation.rendered}
                interactive={false}
              />
            ) : (
              <ExtensionComponent
                name="public.article.card"
                content={presentation.content}
                rendered={presentation.rendered}
                interactive={false}
              />
            )}
          </ThemeTemplate>
        </>
      ) : (
        <section
          className={`surface ${styles.state}`}
          role="status"
          aria-busy="true"
        >
          <Icon name="refresh" className={styles.loading} />
          <p>
            <UiText text="正在读取已保存的草稿…" />
          </p>
        </section>
      )}
    </BlogShell>
  );
}
