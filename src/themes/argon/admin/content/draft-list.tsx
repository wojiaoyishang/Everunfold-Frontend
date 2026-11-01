"use client";
import { useState } from "react";
import type {
  ContentTypeDefinition,
  DraftSummary,
} from "@/generated/content-admin-contract";
import { useDraftCatalog } from "@/core/content-management/use-draft-catalog";
import { Button, TextField } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { RouteLink } from "../../components/ui/route-link";
import { ContentSync } from "./content-sync";
import { DraftActionDialog } from "./draft-action-dialog";

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));

export function DraftList({ type }: { type: ContentTypeDefinition }) {
  const catalog = useDraftCatalog(type);
  const [action, setAction] = useState<DraftSummary | null>(null);
  const [notice, setNotice] = useState("");
  const data = catalog.result;
  const trash = catalog.status === "trash";
  return (
    <>
      <AdminPageHeading
        title={type.label}
        description={type.description}
        action={
          <RouteLink
            className="admin-button admin-button-primary"
            href={`/admin/content/${type.id}/new`}
            showPending
          >
            <Icon name="plus" />
            新建{type.label}
          </RouteLink>
        }
      />
      <section
        className="admin-draft-collection"
        aria-label={`${type.label}列表`}
      >
        <div className="admin-draft-list-toolbar">
          <div className="admin-draft-tabs" aria-label="内容状态">
            {(
              [
                ["all", "全部"],
                ["draft", "草稿"],
                ["published", "已发布"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                aria-pressed={catalog.status === value}
                onClick={() => catalog.setStatus(value)}
              >
                {label}
              </Button>
            ))}
            <Button
              aria-pressed={trash}
              onClick={() => catalog.setStatus("trash")}
            >
              <Icon name="trash" />
              回收站
            </Button>
          </div>
          <div className="admin-draft-search">
            <Icon name="search" />
            <TextField
              type="search"
              aria-label={`搜索${type.label}`}
              value={catalog.search}
              placeholder="搜索标题或正文…"
              onChange={(event) => catalog.setSearch(event.target.value)}
            />
            <Button
              className="admin-icon-button"
              title="刷新列表"
              aria-label="刷新列表"
              disabled={catalog.loading}
              onClick={catalog.refresh}
            >
              <Icon
                name="refresh"
                className={catalog.loading ? "admin-draft-spin" : ""}
              />
            </Button>
          </div>
        </div>
        {catalog.error && (
          <div className="admin-draft-message" role="alert">
            <span>{catalog.error}</span>
            <Button className="admin-button" onClick={catalog.refresh}>
              重试
            </Button>
          </div>
        )}
        {notice && (
          <p className="admin-draft-notice" role="status" key={notice}>
            <Icon name="check" />
            {notice}
          </p>
        )}
        <div className="admin-draft-list" aria-busy={catalog.loading}>
          {!data ? (
            <div className="admin-draft-empty" role="status">
              <Icon name={catalog.error ? "cloud-off" : "edit"} />
              <p>{catalog.loading ? "正在读取内容…" : "暂时无法读取内容"}</p>
            </div>
          ) : data.items.length === 0 ? (
            <div className="admin-draft-empty">
              <Icon name={trash ? "trash" : "edit"} />
              <h2>
                {catalog.search
                  ? "没有找到相关内容"
                  : trash
                    ? "回收站是空的"
                    : `还没有${type.label}草稿`}
              </h2>
              <p>
                {catalog.search
                  ? "试试其他关键词。"
                  : trash
                    ? "删除的内容会保留在这里。"
                    : "写下第一段文字，从这里开始。"}
              </p>
            </div>
          ) : (
            data.items.map((item) => (
              <article className="admin-draft-row" key={item.id}>
                <span className="admin-draft-type-icon">
                  <Icon name={type.icon === "leaf" ? "leaf" : "book"} />
                </span>
                <div className="admin-draft-row-main">
                  <div className="admin-draft-row-title">
                    <RouteLink
                      className="admin-draft-title"
                      href={`/admin/content/${type.id}/${item.id}/edit`}
                      showPending
                    >
                      {item.title || item.preview.slice(0, 60) || "未命名说说"}
                    </RouteLink>
                    {item.is_demo && <span className="admin-badge">示例</span>}
                  </div>
                  <p>
                    {item.excerpt ||
                      (item.title ? item.preview : "") ||
                      (type.supports_excerpt ? "还没有填写摘要" : "记录此刻")}
                  </p>
                  <div className="admin-draft-meta">
                    <span>{item.author}</span>
                    <time dateTime={item.updated_at}>
                      {dateLabel(item.updated_at)}
                    </time>
                    <span>
                      {trash
                        ? "已回收"
                        : item.published_revision
                          ? item.published_revision < item.revision
                            ? "已发布 · 有未发布修改"
                            : "已发布"
                          : "草稿"}
                    </span>
                  </div>
                </div>
                <div className="admin-draft-row-actions">
                  {!trash && (
                    <RouteLink
                      className="admin-button"
                      href={`/admin/content/${type.id}/${item.id}/edit`}
                      showPending
                    >
                      <Icon name="edit" />
                      编辑
                    </RouteLink>
                  )}
                  <Button
                    className="admin-icon-button"
                    disabled={catalog.loading || !catalog.compatible}
                    title={trash ? "恢复草稿" : "移至回收站"}
                    aria-label={`${trash ? "恢复" : "删除"} ${item.title || "说说"}`}
                    onClick={() => setAction(item)}
                  >
                    <Icon name={trash ? "undo" : "trash"} />
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
        <footer className="admin-draft-list-footer">
          <span>
            {data ? `${data.total} 份${trash ? "已回收内容" : "内容"}` : ""}
          </span>
          <div>
            <Button
              className="admin-icon-button"
              aria-label="上一页"
              disabled={catalog.page <= 1 || catalog.loading}
              onClick={() => catalog.setPage(catalog.page - 1)}
            >
              <Icon name="arrow-left" />
            </Button>
            <span>
              {catalog.page} / {Math.max(1, Math.ceil((data?.total ?? 0) / 12))}
            </span>
            <Button
              className="admin-icon-button"
              aria-label="下一页"
              disabled={
                !data || catalog.page * 12 >= data.total || catalog.loading
              }
              onClick={() => catalog.setPage(catalog.page + 1)}
            >
              <Icon name="arrow" />
            </Button>
          </div>
        </footer>
      </section>
      <ContentSync
        key={`${catalog.status}-${data?.items.map((item) => item.revision).join("-")}`}
      />
      {action && (
        <DraftActionDialog
          key={action.id}
          item={action}
          onClose={() => {
            setAction(null);
            catalog.refresh();
          }}
          onDone={() => {
            setNotice(
              action.status === "trash"
                ? "内容已恢复到草稿"
                : "内容已移至回收站",
            );
            setAction(null);
            catalog.refresh();
          }}
        />
      )}
    </>
  );
}
