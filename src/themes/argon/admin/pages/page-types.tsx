"use client";
import { can } from "@/core/accounts/permissions";
import { useAdminAccount } from "@/core/admin/account-context";
import { UiText } from "@/core/i18n/provider";
import { usePageTypes } from "@/core/pages/use-types";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";
import { usePageErrorToast } from "./feedback";
import styles from "./pages.module.css";

export function ManagedPageTypes({ choose = false }: { choose?: boolean }) {
  const actor = useAdminAccount();
  const { items, error, loading, reload } = usePageTypes();
  const write = can(actor, "pages:write");
  usePageErrorToast(error);
  return (
    <>
      <AdminPageHeading
        title={choose ? "选择页面类型" : "页面类型"}
        action={
          <div className={styles.typeActions}>
            <RouteLink href="/admin/pages" className="admin-button">
              <Icon name="arrow-left" />
              <UiText text="返回页面列表" />
            </RouteLink>
          </div>
        }
      />
      {loading && (
        <p role="status" className="account-card">
          <UiText text="正在读取页面类型…" />
        </p>
      )}
      {!loading && error && (
        <div className={styles.typeError}>
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
                  <Icon name={type.source === "registered" ? "grid" : "code"} />
                </span>
                <div>
                  <h2>
                    {type.source === "template" ? (
                      type.title
                    ) : (
                      <UiText
                        text={
                          type.source === "custom" ? "自定义页面" : type.title
                        }
                      />
                    )}
                  </h2>
                  <span>
                    <UiText
                      text={
                        type.source === "template"
                          ? "自定义模板"
                          : type.source === "custom"
                            ? "内置"
                            : "前端插件"
                      }
                    />
                  </span>
                </div>
              </header>
              {type.description && (
                <p>
                  {type.source === "custom" ? (
                    <UiText text="拖放组件搭建页面，也可以切换为源码模式。" />
                  ) : type.source === "template" ? (
                    type.description
                  ) : (
                    <UiText text={type.description} />
                  )}
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
                {type.template_id && (
                  <RouteLink
                    href={`/admin/pages/templates/${type.template_id}`}
                    className="admin-button"
                  >
                    <UiText text={write ? "编辑模板" : "查看模板"} />
                  </RouteLink>
                )}
                {!choose && write && type.source === "custom" && (
                  <RouteLink
                    href="/admin/pages/templates/new"
                    className="admin-button"
                  >
                    <UiText text="创建模板" />
                  </RouteLink>
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
