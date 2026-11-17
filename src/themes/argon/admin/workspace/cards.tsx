"use client";
import { useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import type { WorkspaceCardProps } from "@/core/workspace/types";
import type {
  WorkspacePopularArticle,
  WorkspaceAudit,
  WorkspaceViewPoint,
} from "@/core/contracts/operations";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import { AdminLoadingState } from "../components/loading-state";
import styles from "./workspace.module.css";
const auditLabels: Record<string, string> = {
  login: "登录",
  frontend_node_import: "导入节点",
  frontend_node_sync: "同步节点",
  plugin_route: "调用插件接口",
  "public-settings": "修改站点设置",
  "backend-plugins": "更新后端插件",
  "frontend-plugins": "修改前端插件设置",
};
const queues = {
  pending_comments: "/admin/comments",
  drafts: "/admin/content/article",
  scheduled: "/admin/content/article",
  failed_schedules: "/admin/content/article",
  translations_to_review: "/admin/content/article",
  failed_deliveries: "/admin/settings/nodes",
} as const;
export function CoreWorkspaceCard({
  component,
  data,
  analytics,
  days,
  refreshing,
}: WorkspaceCardProps & { component: string }) {
  if (component in queues) {
    const key = component as keyof typeof queues;
    return (
      <RouteLink className={styles.metric} href={queues[key]}>
        <strong>{data?.[key] ?? "—"}</strong>
        <Icon name="arrow" />
      </RouteLink>
    );
  }
  if (component === "write" || component === "media")
    return (
      <RouteLink
        showPending
        className={styles.shortcut}
        href={
          component === "write" ? "/admin/content/article/new" : "/admin/media"
        }
      >
        <Icon name={component === "write" ? "edit" : "image"} />
        <UiText text={component === "write" ? "撰写文章" : "媒体库"} />
        <Icon name="arrow" />
      </RouteLink>
    );
  if (component === "recent" || component === "upcoming") {
    const items = data?.[component];
    if (!items) return <AdminLoadingState compact />;
    return items.length ? (
      <ul className={styles.queue}>
        {items.map((item) => (
          <li key={item.id}>
            <RouteLink href={item.href}>
              {item.title || <UiText text="无标题" />}
            </RouteLink>
            <time dateTime={item.scheduled_for ?? item.updated_at}>
              {new Date(item.scheduled_for ?? item.updated_at).toLocaleString()}
            </time>
            {item.error && (
              <span role="status">
                <UiText text="发布失败，请打开内容检查后重新排期。" />
              </span>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <Empty
        label={component === "recent" ? "还没有可编辑的内容" : "暂无排期"}
      />
    );
  }
  if (!analytics)
    return refreshing ? (
      <AdminLoadingState compact label="正在读取统计…" />
    ) : (
      <Empty label="统计暂不可用，请重试" />
    );
  if (component === "views")
    return (
      <>
        <div className={styles.totals}>
          <span>
            <UiText text="时段浏览" />
            <strong>{analytics.period_views?.toLocaleString() ?? "—"}</strong>
          </span>
          <span>
            <UiText text="累计浏览" />
            <strong>{analytics.total_views?.toLocaleString() ?? "—"}</strong>
          </span>
          <small>
            <UiText text="按 UTC 自然日统计" />
            {analytics.started_at && (
              <>
                <br />
                <UiText text="统计开始" />{" "}
                <time dateTime={analytics.started_at}>
                  {new Date(analytics.started_at).toLocaleString()}
                </time>
              </>
            )}
          </small>
        </div>
        <ViewChart points={analytics.daily ?? []} />
      </>
    );
  if (component === "popular" || component === "all_time")
    return <Ranking items={analytics[component] ?? []} />;
  if (component === "security" || component === "settings")
    return <AuditList value={analytics[component] ?? null} days={days} />;
  return null;
}
function Empty({ label }: { label: string }) {
  return (
    <p className={styles.empty}>
      <UiText text={label} />
    </p>
  );
}
function Ranking({ items }: { items: WorkspacePopularArticle[] }) {
  if (!items.length) return <Empty label="暂无浏览记录" />;
  const max = Math.max(1, ...items.map((item) => item.views));
  return (
    <ol className={styles.ranking}>
      {items.map((item, index) => (
        <li key={item.id}>
          <span className={styles.rank}>{index + 1}</span>
          <div>
            <RouteLink href={item.href}>
              {item.title || <UiText text="无标题" />}
            </RouteLink>
            <span className={styles.bar} aria-hidden="true">
              <i style={{ width: `${(item.views / max) * 100}%` }} />
            </span>
          </div>
          <strong>{item.views.toLocaleString()}</strong>
        </li>
      ))}
    </ol>
  );
}
function AuditList({
  value,
  days,
}: {
  value: WorkspaceAudit | null;
  days: number;
}) {
  if (!value) return <Empty label="没有访问此页面的权限" />;
  return (
    <>
      <p className={styles.auditTotal}>
        <UiText text="近 {days} 天" values={{ days }} />
        <strong>{value.count.toLocaleString()}</strong>
        <UiText text="次操作" />
      </p>
      {value.items.length ? (
        <ul className={styles.queue}>
          {value.items.map((item) => (
            <li key={item.id}>
              <span>
                {item.actor} ·{" "}
                <UiText text={auditLabels[item.action] ?? item.action} />
              </span>
              <time dateTime={item.created_at}>
                {new Date(item.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <Empty label="暂无操作记录" />
      )}
    </>
  );
}
function ViewChart({ points }: { points: WorkspaceViewPoint[] }) {
  const t = useT();
  const [active, setActive] = useState<number | null>(null);
  if (!points.length) return <Empty label="暂无按日浏览记录" />;
  if (points.length === 1) {
    const [point] = points;
    return (
      <div className={styles.dailySample}>
        <span className={styles.point} aria-hidden="true" />
        <time dateTime={point.day}>{point.day}</time>
        <strong>
          {point.views.toLocaleString()} <UiText text="浏览" />
        </strong>
      </div>
    );
  }
  const selected = active === null ? null : points[active];
  const max = Math.max(1, ...points.map((point) => point.views));
  const width = 720,
    height = 150;
  const x = (index: number) => index / (points.length - 1);
  const y = (views: number) => 1 - (views / max) * 0.92;
  const line = points
    .map((point, i) => `${x(i) * width},${y(point.views) * height}`)
    .join(" ");
  return (
    <div
      className={styles.chart}
      tabIndex={0}
      role="group"
      aria-label={t("访问趋势，方向键查看每天浏览量")}
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          setActive((current) =>
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? points.length - 1
                : Math.max(
                    0,
                    Math.min(
                      points.length - 1,
                      (current ?? 0) + (event.key === "ArrowRight" ? 1 : -1),
                    ),
                  ),
          );
        }
      }}
    >
      <output aria-live="polite">
        {selected
          ? `${selected.day} · ${selected.views.toLocaleString()} ${t("浏览")}`
          : t("每日浏览量")}
      </output>
      <div
        className={styles.plot}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const offset = Math.min(
            1,
            Math.max(0, (event.clientX - rect.left) / rect.width),
          );
          setActive(Math.round(offset * (points.length - 1)));
        }}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className={styles.gridline}
            d={`M0 0H${width}M0 ${height / 2}H${width}M0 ${height}H${width}`}
          />
          <polygon
            className={styles.area}
            points={`0,${height} ${line} ${width},${height}`}
          />
          <polyline className={styles.line} points={line} />
        </svg>
        {active !== null && selected && (
          <span
            className={styles.point}
            aria-hidden="true"
            style={{
              left: `${x(active) * 100}%`,
              top: `${y(selected.views) * 100}%`,
            }}
          />
        )}
      </div>
      <div className={styles.axis}>
        <time dateTime={points[0].day}>{points[0].day}</time>
        <time dateTime={points.at(-1)?.day}>{points.at(-1)?.day}</time>
      </div>
    </div>
  );
}
