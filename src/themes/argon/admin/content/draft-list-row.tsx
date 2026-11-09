"use client";
import { UiText, useT } from "@/core/i18n/provider";

import type {
  ContentTypeDefinition,
  DraftListItem,
} from "@/core/contracts/content-admin";
import { resourceUrl } from "@/core/content/urls";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import { MediaPreview } from "../media/media-preview";
import styles from "./draft-list.module.css";
import { TranslationMenu } from "./translation-menu";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";

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
      <span className={styles.mobileLabel}>
        <UiText text={label} />
      </span>
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
  onQuick,
  selected,
  onSelect,
}: {
  item: DraftListItem;
  type: ContentTypeDefinition;
  trash: boolean;
  disabled: boolean;
  onAction: () => void;
  onQuick: () => void;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const icon = type.icon === "leaf" ? "leaf" : "book";
  const editable = can(
    useAdminAccount(),
    "content:write",
    item.owner_id ?? null,
  );
  const destination = `/admin/content/${type.id}/${item.id}/${editable ? "edit" : "preview"}`;
  const cover = resourceUrl(item.cover_url);
  const date =
    item.scheduled_for ??
    (item.published_revision
      ? (item.published_at ?? item.updated_at)
      : item.updated_at);
  const status = trash
    ? item.status === "trash"
      ? "已回收"
      : "有回收的译文"
    : item.scheduled_for
      ? item.published_revision
        ? "已发布 · 待定时更新"
        : "待定时发布"
      : item.schedule_error
        ? "定时发布失败"
        : item.published_revision
          ? "已发布"
          : "草稿";
  return (
    <article role="row" className={styles.row}>
      <div role="rowheader" className={styles.titleCell}>
        {editable && (
          <Checkbox
            aria-label={`选择 ${item.title || "说说"}`}
            checked={selected}
            disabled={disabled}
            onChange={onSelect}
          />
        )}
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
            <RouteLink className={styles.title} href={destination} showPending>
              {item.title || item.preview.slice(0, 60) || (
                <UiText text="未命名说说" />
              )}
            </RouteLink>
            {!trash && item.published_revision && item.public_path ? (
              <RouteLink
                className={styles.publicLink}
                href={item.public_path}
                target="_blank"
                rel="noopener noreferrer"
                title="在前台打开"
                aria-label={`${t("在前台打开")} ${item.title || t("说说")}`}
              >
                <Icon name="external" />
              </RouteLink>
            ) : null}
            {item.pinned && (
              <span className={styles.badge}>
                <UiText text="置顶" />
              </span>
            )}
            {item.is_demo && (
              <span className={styles.badge}>
                <UiText text="示例" />
              </span>
            )}
            {item.translations?.length ? (
              <TranslationMenu
                members={item.translations}
                type={type.id}
                current={item.id}
                original={item.id}
                disabled={disabled}
                readOnly={!editable}
                publicLinks
              />
            ) : null}
          </div>
          <p className={styles.excerpt}>
            {item.excerpt ||
              (item.title ? item.preview : "") ||
              (type.supports_excerpt ? (
                <UiText text="还没有填写摘要" />
              ) : (
                <UiText text="记录此刻" />
              ))}
          </p>
          {item.published_revision &&
            item.published_revision < item.revision && (
              <small className={styles.unpublished}>
                <UiText text="有未发布修改" />
              </small>
            )}
        </div>
      </div>
      <div role="cell" className={styles.author}>
        <span className={styles.mobileLabel}>
          <UiText text="作者" />
        </span>
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
        <span>
          <UiText text={status} />
        </span>
        <time dateTime={date}>{dateLabel(date)}</time>
      </div>
      <div role="cell" className={styles.actions}>
        {!trash && (
          <RouteLink className="admin-button" href={destination} showPending>
            <Icon name={editable ? "edit" : "eye"} />
            <UiText text={editable ? "编辑" : "查看"} />
          </RouteLink>
        )}
        {editable && !trash && (
          <Button
            className="admin-icon-button"
            title="快速编辑"
            aria-label={`快速编辑 ${item.title || "说说"}`}
            disabled={disabled}
            onClick={onQuick}
          >
            <Icon name="settings" />
          </Button>
        )}
        {editable && (
          <Button
            className="admin-icon-button"
            disabled={disabled}
            title={trash ? "恢复草稿" : "移至回收站"}
            aria-label={`${trash ? "恢复" : "删除"} ${item.title || "说说"}`}
            onClick={onAction}
          >
            <Icon name={trash ? "undo" : "trash"} />
          </Button>
        )}
      </div>
    </article>
  );
}
