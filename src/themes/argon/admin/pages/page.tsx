"use client";
import { useEffect, useState } from "react";
import type { ManagedPageSummary } from "@/core/contracts/pages";
import { readManagedPages, removeManagedPage } from "@/core/contracts/pages";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { useAccountAction } from "@/core/accounts/use-action";
import { pagesFailure } from "@/core/pages/failure";
import { UiText, useT } from "@/core/i18n/provider";
import { Button, TextField } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import styles from "./pages.module.css";
import { PageEnabledControl } from "./enabled-control";
import { PageLanguageMenu } from "./language-menu";
export function ManagedPagesDirectory() {
  const { baseUrl, csrfToken } = useAdminRequest(),
    actor = useAdminAccount(),
    t = useT();
  const [items, setItems] = useState<ManagedPageSummary[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [restore, setRestore] = useState<ManagedPageSummary | null>(null);
  const action = useAccountAction(pagesFailure);
  useEffect(() => {
    const controller = new AbortController();
    void readManagedPages(baseUrl, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) {
          setItems(response.data.items);
          setError("");
          setLoading(false);
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setError(pagesFailure(failure));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [baseUrl, refresh]);
  const rows = items.filter(
    (row) =>
      (filter === "trash"
        ? row.archived
        : !row.archived && (filter === "all" || row.source === filter)) &&
      `${row.title} ${row.path} ${(row.translations?.members ?? []).map((m) => `${m.title} ${m.path} ${m.language}`).join(" ")}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <>
      <AdminPageHeading
        title="页面"
        action={
          can(actor, "pages:write") ? (
            <RouteLink
              href="/admin/pages/new"
              className="admin-button admin-button-primary"
            >
              <Icon name="plus" />
              <UiText text="新建自定义页面" />
            </RouteLink>
          ) : null
        }
      />
      <section className="account-card">
        <div className={styles.toolbar}>
          <nav className={styles.tabs} aria-label={t("页面来源")}>
            {[
              ["all", "全部"],
              ["registered", "前端注册"],
              ["custom", "自定义代码"],
              ["trash", "回收站"],
            ].map(([key, label]) => (
              <Button
                key={key}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                <UiText text={label} />
              </Button>
            ))}
          </nav>
          <div className={styles.search}>
            <TextField
              type="search"
              aria-label={t("搜索页面")}
              placeholder={t("搜索标题或路径…")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              className="admin-button"
              onClick={() => {
                setLoading(true);
                setRefresh((value) => value + 1);
              }}
            >
              <UiText text="刷新" />
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {rows.map((row) => (
          <div className={styles.row} key={row.id}>
            <span className={styles.pageIcon}>
              <Icon name={row.source === "registered" ? "grid" : "code"} />
            </span>
            <div className={styles.rowInfo}>
              <RouteLink
                href={"/admin/pages/" + row.id}
                className={styles.title}
              >
                {row.title}
              </RouteLink>
              <span>{row.path}</span>
            </div>
            <div className={styles.badges}>
              <span className="admin-badge">
                <UiText
                  text={row.source === "registered" ? "前端注册" : "自定义代码"}
                />
              </span>
              {row.archived && (
                <span className="admin-badge">
                  <UiText text="回收站" />
                </span>
              )}
              {row.has_unapplied_changes && (
                <span className="admin-badge">
                  <UiText text="未应用的草稿" />
                </span>
              )}
              {!row.available && (
                <span className="admin-badge">
                  <UiText text="实现未就绪" />
                </span>
              )}
            </div>
            <div className={styles.rowActions}>
              {row.translations && (
                <PageLanguageMenu group={row.translations} current={row.id} />
              )}
              {!row.archived && (
                <PageEnabledControl
                  page={row}
                  disabled={loading}
                  onChanged={() => {
                    setLoading(true);
                    setRefresh((value) => value + 1);
                  }}
                />
              )}
              {row.archived &&
                can(actor, "pages:write") &&
                can(actor, "pages:publish") && (
                  <Button
                    className="admin-button"
                    onClick={() => setRestore(row)}
                  >
                    <UiText text="恢复" />
                  </Button>
                )}
              <RouteLink
                href={"/admin/pages/" + row.id}
                className="admin-button"
              >
                <Icon
                  name={
                    can(actor, "pages:write") && !row.archived ? "edit" : "eye"
                  }
                />
                <UiText
                  text={
                    can(actor, "pages:write") && !row.archived
                      ? "编辑页面"
                      : "查看"
                  }
                />
              </RouteLink>
            </div>
          </div>
        ))}
        {loading && (
          <p role="status" className={styles.empty}>
            <UiText text="正在读取页面…" />
          </p>
        )}
        {!loading && !error && !rows.length && (
          <p className={styles.empty}>
            <UiText text={query ? "没有找到匹配的页面。" : "暂无页面。"} />
          </p>
        )}
        <p className={styles.help}>
          <UiText text="{count} 个页面" values={{ count: rows.length }} />
        </p>
      </section>
      <ConfirmDialog
        open={!!restore}
        title="恢复此页面？"
        description="源码与配置将恢复，页面保持停用。"
        confirmLabel="恢复页面"
        onCancel={() => setRestore(null)}
        error={action.message}
        onConfirm={() =>
          action.run(async (signal) => {
            const input = {
              id: restore!.id,
              expected_revision: restore!.revision,
              restore: true,
            };
            await removeManagedPage(
              baseUrl,
              { ...input, operation_id: action.operation(input) },
              csrfToken,
              { signal },
            );
          })
        }
        onConfirmed={() => {
          setRestore(null);
          setRefresh((value) => value + 1);
        }}
      />
    </>
  );
}
