"use client";
import { UiText } from "@/core/i18n/provider";

import { useState } from "react";
import { useLanguageCatalog, useT } from "@/core/i18n/provider";
import type {
  ContentTypeDefinition,
  DraftListItem,
} from "@/core/contracts/content-admin";
import { useDraftCatalog } from "@/core/content-management/use-draft-catalog";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { RouteLink } from "../../components/ui/route-link";
import { ContentSync } from "./content-sync";
import { DraftActionDialog } from "./draft-action-dialog";
import { DraftListRow } from "./draft-list-row";
import styles from "./draft-list.module.css";
import { Select } from "../../components/ui/select";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";

export function DraftList({ type }: { type: ContentTypeDefinition }) {
  const catalog = useDraftCatalog(type);
  const user = useAdminAccount();
  const languages = useLanguageCatalog();
  const t = useT();
  const [action, setAction] = useState<DraftListItem | null>(null);
  const [notice, setNotice] = useState("");
  const data = catalog.result;
  const trash = catalog.status === "trash";
  return (
    <>
      <AdminPageHeading
        title={type.label}
        action={
          can(user, "content:write") && (
            <RouteLink
              className="admin-button admin-button-primary"
              href={`/admin/content/${type.id}/new`}
              showPending
            >
              <Icon name="plus" />
              <UiText text="新建" />
              <UiText text={type.label} />
            </RouteLink>
          )
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
                <UiText text={label} />
              </Button>
            ))}
            <Button
              aria-pressed={trash}
              onClick={() => catalog.setStatus("trash")}
            >
              <Icon name="trash" />
              <UiText text="回收站" />
            </Button>
          </div>
          <Form
            className={`admin-draft-search ${styles.search}`}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              catalog.submitSearch();
            }}
          >
            <Select
              name="content-list-language"
              label="内容语言筛选"
              value={catalog.language}
              options={[
                { value: "__all", label: t("全部语言") },
                ...languages.languages.map((item) => ({
                  value: item.code,
                  label: item.name,
                })),
              ]}
              onValueChange={(value) => catalog.setLanguage(value)}
            />
            <TextField
              type="search"
              aria-label={`搜索${type.label}`}
              value={catalog.search}
              placeholder="标题、正文、作者、分类或标签"
              maxLength={200}
              onChange={(event) => catalog.setSearch(event.target.value)}
            />
            <Button type="submit" className="admin-button">
              <UiText text="搜索" />
            </Button>
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
          </Form>
        </div>
        {catalog.error && (
          <div className="admin-draft-message" role="alert">
            <span>{catalog.error}</span>
            <Button className="admin-button" onClick={catalog.refresh}>
              <UiText text="重试" />
            </Button>
          </div>
        )}
        {notice && (
          <p className="admin-draft-notice" role="status" key={notice}>
            <Icon name="check" />
            {notice}
          </p>
        )}
        <div
          className={`admin-draft-list ${styles.list}`}
          aria-busy={catalog.loading}
        >
          {!data ? (
            <div className="admin-draft-empty" role="status">
              <Icon name={catalog.error ? "cloud-off" : "edit"} />
              <p>
                {catalog.loading ? (
                  <UiText text="正在读取内容…" />
                ) : (
                  <UiText text="暂时无法读取内容" />
                )}
              </p>
            </div>
          ) : data.items.length === 0 ? (
            <div className="admin-draft-empty">
              <Icon name={trash ? "trash" : "edit"} />
              <h2>
                {catalog.appliedSearch ? (
                  <UiText text="没有找到相关内容" />
                ) : trash ? (
                  <UiText text="回收站是空的" />
                ) : (
                  `还没有${type.label}草稿`
                )}
              </h2>
              <p>
                {catalog.appliedSearch ? (
                  <UiText text="试试其他关键词。" />
                ) : trash ? (
                  <UiText text="删除的内容会保留在这里。" />
                ) : (
                  <UiText text="写下第一段文字，从这里开始。" />
                )}
              </p>
            </div>
          ) : (
            <div
              className={styles.table}
              role="table"
              aria-label={`${type.label}条目`}
              aria-colcount={7}
            >
              <div className={styles.headers} role="row">
                {["标题", "作者", "分类", "标签", "评论", "日期", "操作"].map(
                  (label) => (
                    <span role="columnheader" key={label}>
                      <UiText text={label} />
                    </span>
                  ),
                )}
              </div>
              {data.items.map((item) => (
                <DraftListRow
                  key={item.id}
                  item={item}
                  type={type}
                  trash={trash}
                  disabled={catalog.loading || !catalog.compatible}
                  onAction={() => setAction(item)}
                />
              ))}
            </div>
          )}
        </div>
        <footer className="admin-draft-list-footer">
          <span className={styles.footerLabel} role="status">
            {catalog.loading ? (
              <UiText text="正在读取…" />
            ) : data ? (
              `${data.total} 份${trash ? "已回收内容" : "内容"}`
            ) : (
              ""
            )}
            {catalog.appliedSearch && (
              <>
                {" "}
                · “{catalog.appliedSearch}”
                <Button
                  className={styles.clearSearch}
                  onClick={catalog.clearSearch}
                >
                  <UiText text="清除搜索" />
                </Button>
              </>
            )}
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
      {(user.role === "admin" ||
        user.permissions?.["content:publish"] === "all") && (
        <ContentSync
          key={`${catalog.status}-${data?.items.map((item) => item.revision).join("-")}`}
        />
      )}
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
