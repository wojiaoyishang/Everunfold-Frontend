"use client";
import { can } from "@/core/accounts/permissions";
import { useAdminAccount } from "@/core/admin/account-context";
import { UiText } from "@/core/i18n/provider";
import { usePageTypes } from "@/core/pages/use-types";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";
import styles from "./pages.module.css";

export function ManagedPageTypes({ choose = false }: { choose?: boolean }) {
  const actor = useAdminAccount();
  const { items, error, loading, reload } = usePageTypes();
  const write = can(actor, "pages:write");
  return (
    <>
      <AdminPageHeading
        title={choose ? "选择页面类型" : "页面类型"}
        action={
          <RouteLink href="/admin/pages" className="admin-button">
            <Icon name="arrow-left" />
            <UiText text="返回页面列表" />
          </RouteLink>
        }
      />
      {loading && (
        <p role="status" className="account-card">
          <UiText text="正在读取页面类型…" />
        </p>
      )}
      {!loading && error && (
        <div className={styles.typeError} role="alert">
          <p>{error}</p>
          <Button className="admin-button" onClick={reload}>
            <UiText text="重试" />
          </Button>
        </div>
      )}
      {!loading && !error && (
        <div className={styles.typeGrid}>
          {items.map((type) => (
            <article key={type.id} className={styles.typeCard}>
              <header>
                <span className={styles.pageIcon}>
                  <Icon name={type.source === "custom" ? "code" : "grid"} />
                </span>
                <div>
                  <h2>
                    <UiText text={type.title} />
                  </h2>
                  <span>
                    <UiText
                      text={type.source === "custom" ? "内置" : "前端插件"}
                    />
                  </span>
                </div>
              </header>
              {type.description && (
                <p>
                  <UiText text={type.description} />
                </p>
              )}
              <div className={styles.typeActions}>
                {!choose && type.page_count > 0 && (
                  <RouteLink
                    href={`/admin/pages?type=${encodeURIComponent(type.id)}`}
                    className="admin-button"
                  >
                    <UiText
                      text="{count} 个页面"
                      values={{ count: type.page_count }}
                    />
                  </RouteLink>
                )}
                {!choose && type.page_count === 0 && (
                  <span className="admin-badge">
                    <UiText text="暂无页面。" />
                  </span>
                )}
                {!type.available && (
                  <span className="admin-badge">
                    <UiText text="实现未就绪" />
                  </span>
                )}
                {write && type.available && (
                  <RouteLink
                    href={`/admin/pages/new?type=${encodeURIComponent(type.id)}`}
                    className={`admin-button${choose ? " admin-button-primary" : ""}`}
                  >
                    <Icon name="plus" />
                    <UiText text="新建页面" />
                  </RouteLink>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
