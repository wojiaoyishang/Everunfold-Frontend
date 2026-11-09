"use client";
import { useMemo, useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { useTaxonomies } from "@/core/content-management/use-taxonomies";
import type { TaxonomyItem } from "@/core/contracts/content-admin";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { AdminPageHeading } from "../components/page-heading";
import { Icon } from "../../components/icon";
import { AdminActionButton } from "../components/action-button";
import { TaxonomyDialog } from "./term-dialog";
import { AdminTagCloud } from "./tag-cloud";
import styles from "./taxonomy.module.css";
export function TaxonomiesPage() {
  const t = useT();
  const user = useAdminAccount(),
    allowed = can(user, "content:read", null),
    writable = can(user, "content:write", null);
  const [kind, setKind] = useState<"category" | "tag">("category"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [view, setView] = useState<"cloud" | "list">("cloud");
  const catalog = useTaxonomies(kind, query, page, allowed);
  const cloudView = kind === "tag" && view === "cloud";
  const cloudItems = useMemo(
    () =>
      (catalog.data?.parents ?? []).filter((item) =>
        item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    [catalog.data, query],
  );
  const [command, setCommand] = useState<{
      action: "create" | "update" | "merge" | "remove";
      item?: TaxonomyItem;
    } | null>(null),
    [notice, setNotice] = useState("");
  if (!allowed)
    return (
      <p>
        <UiText text="管理分类与标签需要全部内容权限。" />
      </p>
    );
  return (
    <>
      <AdminPageHeading
        title="分类与标签"
        action={
          writable && (
            <AdminActionButton
              icon="plus"
              tone="accent"
              disabled={catalog.loading || !!catalog.error}
              onClick={() => setCommand({ action: "create" })}
            >
              <UiText text={kind === "category" ? "添加分类" : "添加标签"} />
            </AdminActionButton>
          )
        }
      />
      <section className={styles.card}>
        <div className={styles.toolbar}>
          <div className="admin-draft-tabs">
            {(
              [
                ["category", "分类"],
                ["tag", "标签"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                aria-pressed={kind === value}
                onClick={() => {
                  setKind(value);
                  setPage(1);
                }}
              >
                <UiText text={label} />
              </Button>
            ))}
          </div>
          {kind === "tag" && (
            <div className={styles.views}>
              <AdminActionButton
                icon="shapes"
                aria-pressed={view === "cloud"}
                onClick={() => setView("cloud")}
              >
                <UiText text="词云" />
              </AdminActionButton>
              <AdminActionButton
                icon="list"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <UiText text="列表" />
              </AdminActionButton>
            </div>
          )}
          <Form
            className={styles.search}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
              setPage(1);
            }}
          >
            <div className={`admin-search ${styles.searchField}`}>
              <Icon name="search" />
              <TextField
                type="search"
                aria-label={t("搜索分类或标签")}
                placeholder={t("搜索名称…")}
                value={search}
                maxLength={200}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <AdminActionButton type="submit" icon="search">
              <UiText text="搜索" />
            </AdminActionButton>
            <AdminActionButton
              icon="refresh"
              disabled={catalog.loading}
              onClick={catalog.refresh}
            >
              <UiText text="刷新" />
            </AdminActionButton>
          </Form>
        </div>
        {catalog.error && (
          <p className={styles.message} role="alert">
            <UiText text={catalog.error} />
          </p>
        )}
        {notice && (
          <p className={styles.message} role="status">
            <UiText text={notice} />
          </p>
        )}
        {cloudView && catalog.data ? (
          <AdminTagCloud
            items={cloudItems}
            disabled={catalog.loading || !!catalog.error}
            writable={writable}
            onSelect={(item) => {
              if (writable) setCommand({ action: "update", item });
              else {
                setSearch(item.name);
                setQuery(item.name);
                setPage(1);
                setView("list");
              }
            }}
          />
        ) : (
          <div aria-busy={catalog.loading}>
            {catalog.data?.items.map((item) => (
              <article className={styles.row} key={item.id}>
                <div className={styles.identity}>
                  <strong>{item.name}</strong>
                  <small>
                    {kind === "category" && item.parent_id && (
                      <>
                        {
                          catalog.data?.parents.find(
                            (p) => p.id === item.parent_id,
                          )?.name
                        }{" "}
                        /{" "}
                      </>
                    )}
                    {item.slug}
                  </small>
                </div>
                <div className={styles.counts}>
                  <span>
                    <UiText text="已发布" /> <b>{item.published_count}</b>
                  </span>
                  <span>
                    <UiText text="工作稿" /> <b>{item.draft_count}</b>
                  </span>
                </div>
                {writable && (
                  <div className={styles.actions}>
                    <AdminActionButton
                      icon="edit"
                      tone="accent"
                      disabled={catalog.loading || !!catalog.error}
                      onClick={() => setCommand({ action: "update", item })}
                    >
                      <UiText text="编辑" />
                    </AdminActionButton>
                    <AdminActionButton
                      icon="copy"
                      disabled={catalog.loading || !!catalog.error}
                      onClick={() => setCommand({ action: "merge", item })}
                    >
                      <UiText text="合并" />
                    </AdminActionButton>
                    <AdminActionButton
                      icon="trash"
                      tone="danger"
                      disabled={catalog.loading || !!catalog.error}
                      onClick={() => setCommand({ action: "remove", item })}
                    >
                      <UiText text="删除" />
                    </AdminActionButton>
                  </div>
                )}
              </article>
            ))}
            {!catalog.data?.items.length && (
              <p className={styles.message}>
                <UiText
                  text={
                    catalog.loading ? "正在读取…" : "没有匹配的分类或标签。"
                  }
                />
              </p>
            )}
          </div>
        )}
        <footer className={styles.footer}>
          <span>
            {catalog.data?.total ?? 0} <UiText text="项" />
          </span>
          {!cloudView && (
            <div className={styles.actions}>
              <AdminActionButton
                icon="arrow-left"
                disabled={page <= 1 || catalog.loading}
                onClick={() => setPage(page - 1)}
              >
                <UiText text="上一页" />
              </AdminActionButton>
              <span>
                {page} /{" "}
                {Math.max(1, Math.ceil((catalog.data?.total ?? 0) / 20))}
              </span>
              <AdminActionButton
                icon="arrow"
                disabled={
                  page * 20 >= (catalog.data?.total ?? 0) || catalog.loading
                }
                onClick={() => setPage(page + 1)}
              >
                <UiText text="下一页" />
              </AdminActionButton>
            </div>
          )}
        </footer>
      </section>
      {command && (
        <TaxonomyDialog
          key={`${kind}-${command.action}-${command.item?.id}`}
          kind={kind}
          {...command}
          choices={catalog.data?.parents ?? []}
          onClose={() => setCommand(null)}
          onSaved={() => {
            setCommand(null);
            setNotice("分类与标签已更新。");
            catalog.refresh();
          }}
        />
      )}
    </>
  );
}
