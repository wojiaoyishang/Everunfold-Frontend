"use client";
import { UiText } from "@/core/i18n/provider";

import { useMemo } from "react";
import type { Site, Taxonomy } from "@/core/content/types";
import { previewContent } from "@/core/content-management/preview";
import { useContentPreview } from "@/core/content-management/use-content-preview";
import { presentLegacyContent } from "@/core/content/presentation";
import { renderContent } from "@/core/rendering/content";
import { BlogShell } from "../components/shell";
import { ArticleCard } from "../components/article-card";
import { ShuoshuoCardView } from "../components/shuoshuo-card";
import { PagePresentation } from "../components/route-state";
import { Button } from "../components/ui/primitives";
import { RouteLink } from "../components/ui/route-link";
import { Icon } from "../components/icon";
import styles from "./content-preview.module.css";

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
  const { detail, error, baseUrl, retry } = useContentPreview(type, id);
  const presentation = useMemo(() => {
    if (!detail) return null;
    const content = previewContent(detail, terms);
    return {
      content,
      rendered: renderContent(content, site?.settings?.shortcodes),
    };
  }, [detail, terms, site?.settings?.shortcodes]);
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
          <RouteLink className={styles.button} href={back}>
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
          {type === "shuoshuo" ? (
            <ShuoshuoCardView
              entry={{
                content: presentLegacyContent(presentation.content),
                example: false,
              }}
              detail
              rendered={presentation.rendered}
              interactive={false}
            />
          ) : (
            <ArticleCard
              content={presentation.content}
              rendered={presentation.rendered}
              interactive={false}
            />
          )}
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
