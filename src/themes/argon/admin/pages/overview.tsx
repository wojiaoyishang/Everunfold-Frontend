"use client";
import { UiText } from "@/core/i18n/provider";
import { useAdminAccount } from "@/core/admin/account-context";
import { useWorkspace } from "@/core/operations/use-data";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";
import { can } from "@/core/accounts/permissions";
import styles from "./overview.module.css";
export function AdminOverview() {
  const user = useAdminAccount();
  const { data, loading, error, refresh } = useWorkspace();
  const cards = data
    ? [
        {
          label: "待审核评论",
          count: data.pending_comments,
          href: "/admin/comments",
        },
        {
          label: "未发布草稿",
          count: data.drafts,
          href: "/admin/content/article",
        },
        {
          label: "定时发布",
          count: data.scheduled,
          href: "#workspace-schedules",
        },
        {
          label: "发布失败",
          count: data.failed_schedules,
          href: "#workspace-schedules",
        },
        {
          label: "译文待核对",
          count: data.translations_to_review,
          href: "/admin/content/article",
        },
        {
          label: "同步待重试",
          count: data.failed_deliveries,
          href: "/admin/settings/nodes",
        },
      ].filter((item) => item.count != null)
    : [];
  return (
    <>
      <AdminPageHeading
        title="工作台"
        description="查看待办，继续最近的编辑。"
        action={
          <Button
            className="admin-button"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <Icon name="refresh" />
            <UiText text="刷新" />
          </Button>
        }
      />
      {error && (
        <p className={styles.notice} role="alert">
          <UiText text={error} />
        </p>
      )}
      <div className={styles.stats} aria-busy={loading}>
        {cards.map((item) => (
          <RouteLink key={item.label} href={item.href} className={styles.stat}>
            <span>
              <UiText text={item.label} />
            </span>
            <strong>{item.count}</strong>
          </RouteLink>
        ))}
        {!data && loading && (
          <p role="status">
            <UiText text="正在读取工作台…" />
          </p>
        )}
      </div>
      <div className="admin-shortcuts">
        {can(user, "content:write") && (
          <RouteLink
            href="/admin/content/article/new"
            showPending
            className="admin-shortcut"
          >
            <span className="admin-shortcut-icon">
              <Icon name="edit" />
            </span>
            <h2>
              <UiText text="撰写文章" />
            </h2>
            <Icon name="arrow" />
          </RouteLink>
        )}
        {can(user, "media:read") && (
          <RouteLink href="/admin/media" showPending className="admin-shortcut">
            <span className="admin-shortcut-icon">
              <Icon name="image" />
            </span>
            <h2>
              <UiText text="媒体库" />
            </h2>
            <Icon name="arrow" />
          </RouteLink>
        )}
      </div>
      <div className="admin-overview-grid">
        {can(user, "content:read") && (
          <>
            <section className="admin-panel">
              <header>
                <h2>
                  <UiText text="最近编辑" />
                </h2>
                <RouteLink href="/admin/content/article">
                  <UiText text="所有文章" />
                </RouteLink>
              </header>
              <ul className={styles.queue}>
                {data?.recent?.map((item) => (
                  <li key={item.id}>
                    <RouteLink href={item.href}>
                      {item.title || <UiText text="无标题" />}
                    </RouteLink>
                    <time dateTime={item.updated_at}>
                      {new Date(item.updated_at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
              {data && !data.recent?.length && (
                <p className={styles.empty}>
                  <UiText text="还没有可编辑的内容" />
                </p>
              )}
            </section>
            <section className="admin-panel" id="workspace-schedules">
              <header>
                <h2>
                  <UiText text="发布排期" />
                </h2>
              </header>
              <ul className={styles.queue}>
                {data?.upcoming?.map((item) => (
                  <li key={item.id}>
                    <RouteLink href={item.href}>
                      {item.title || <UiText text="无标题" />}
                    </RouteLink>
                    {item.scheduled_for && (
                      <time dateTime={item.scheduled_for}>
                        {new Date(item.scheduled_for).toLocaleString()}
                      </time>
                    )}
                    {item.error && (
                      <span className={styles.error}>
                        <UiText text="发布失败，请打开内容检查后重新排期。" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {data && !data.upcoming?.length && (
                <p className={styles.empty}>
                  <UiText text="暂无排期" />
                </p>
              )}
            </section>
          </>
        )}
        {!can(user, "content:read") && (
          <section className="admin-panel">
            <header>
              <h2>{user.display_name}</h2>
            </header>
            <p className={styles.empty}>
              <UiText text="从侧边栏选择已授权的管理功能。" />
            </p>
          </section>
        )}
      </div>
    </>
  );
}
