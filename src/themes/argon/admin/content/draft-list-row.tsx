"use client";
import type {
  ContentTypeDefinition,
  DraftListItem,
} from "@/generated/content-admin-contract";
import { resourceUrl } from "@/core/content/urls";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import { MediaPreview } from "../media/media-preview";
import styles from "./draft-list.module.css";

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));

function Terms({ label, values }: { label: string; values: string[] }) {
  return (
    <div role="cell" className={styles.terms} title={values.join("、")}>
      <span className={styles.mobileLabel}>{label}</span>
      <span>{values.join("、") || "—"}</span>
    </div>
  );
}

export function DraftListRow({
  item,
  type,
  trash,
  disabled,
  onAction,
}: {
  item: DraftListItem;
  type: ContentTypeDefinition;
  trash: boolean;
  disabled: boolean;
  onAction: () => void;
}) {
  const icon = type.icon === "leaf" ? "leaf" : "book";
  const cover = resourceUrl(item.cover_url);
  const date = item.published_revision
    ? (item.published_at ?? item.updated_at)
    : item.updated_at;
  const status = trash ? "已回收" : item.published_revision ? "已发布" : "草稿";
  return (
    <article role="row" className={styles.row}>
      <div role="rowheader" className={styles.titleCell}>
        <span className={styles.cover} aria-hidden="true">
          {cover ? (
            <MediaPreview
              key={cover}
              url={cover}
              kind="image"
              label=""
              fallback={<Icon name={icon} />}
            />
          ) : (
            <Icon name={icon} />
          )}
        </span>
        <div className={styles.titleText}>
          <div className={styles.titleLine}>
            <RouteLink
              className={styles.title}
              href={`/admin/content/${type.id}/${item.id}/edit`}
              showPending
            >
              {item.title || item.preview.slice(0, 60) || "未命名说说"}
            </RouteLink>
            {item.pinned && <span className={styles.badge}>置顶</span>}
            {item.is_demo && <span className={styles.badge}>示例</span>}
          </div>
          <p className={styles.excerpt}>
            {item.excerpt ||
              (item.title ? item.preview : "") ||
              (type.supports_excerpt ? "还没有填写摘要" : "记录此刻")}
          </p>
          {item.published_revision &&
            item.published_revision < item.revision && (
              <small className={styles.unpublished}>有未发布修改</small>
            )}
        </div>
      </div>
      <div role="cell" className={styles.author}>
        <span className={styles.mobileLabel}>作者</span>
        {item.author}
      </div>
      <Terms label="分类" values={item.categories ?? []} />
      <Terms label="标签" values={item.tags ?? []} />
      <div
        role="cell"
        className={styles.comments}
        title="已审核通过的评论"
        aria-label={`${item.comment_count ?? 0} 条已审核评论`}
      >
        <Icon name="comment" />
        <span>{item.comment_count ?? 0}</span>
      </div>
      <div role="cell" className={styles.date}>
        <span>{status}</span>
        <time dateTime={date}>{dateLabel(date)}</time>
      </div>
      <div role="cell" className={styles.actions}>
        {!trash && (
          <RouteLink
            className="admin-button"
            href={`/admin/content/${type.id}/${item.id}/edit`}
            showPending
          >
            编辑
          </RouteLink>
        )}
        <Button
          className="admin-icon-button"
          disabled={disabled}
          title={trash ? "恢复草稿" : "移至回收站"}
          aria-label={`${trash ? "恢复" : "删除"} ${item.title || "说说"}`}
          onClick={onAction}
        >
          <Icon name={trash ? "undo" : "trash"} />
        </Button>
      </div>
    </article>
  );
}
