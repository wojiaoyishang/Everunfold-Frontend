"use client";
import { UiText } from "@/core/i18n/provider";

import { useAdminAccount } from "@/core/admin/account-context";
import { Icon } from "../../components/icon";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";
export function AdminOverview() {
  const user = useAdminAccount();
  return (
    <>
      <AdminPageHeading title="工作台" />
      <div className="admin-shortcuts">
        <RouteLink href="/admin/content" showPending className="admin-shortcut">
          <span className="admin-shortcut-icon">
            <Icon name="copy" />
          </span>
          <div>
            <h2>
              <UiText text="内容管理" />
            </h2>
          </div>
          <Icon name="arrow" />
        </RouteLink>
        <RouteLink href="/admin/media" showPending className="admin-shortcut">
          <span className="admin-shortcut-icon">
            <Icon name="image" />
          </span>
          <div>
            <h2>
              <UiText text="媒体库" />
            </h2>
          </div>
          <Icon name="arrow" />
        </RouteLink>
      </div>
      <div className="admin-overview-grid">
        <section className="admin-panel">
          <header>
            <h2>
              <UiText text="当前账户" />
            </h2>
            <span className="admin-badge admin-badge-success">
              <Icon name="check" /> <UiText text="已登录" />
            </span>
          </header>
          <dl className="admin-details">
            <div>
              <dt>
                <UiText text="显示名称" />
              </dt>
              <dd>{user.display_name}</dd>
            </div>
            <div>
              <dt>
                <UiText text="用户名" />
              </dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>
                <UiText text="账户角色" />
              </dt>
              <dd>
                <UiText text="管理员" />
              </dd>
            </div>
          </dl>
        </section>
        <section className="admin-panel">
          <header>
            <h2>
              <UiText text="工作空间状态" />
            </h2>
          </header>
          <ul className="admin-capabilities">
            <li>
              <span>
                <UiText text="账号访问" />
              </span>
              <span className="admin-badge admin-badge-success">
                <UiText text="已启用" />
              </span>
            </li>
            <li>
              <span>
                <UiText text="草稿编辑" />
              </span>
              <span className="admin-badge admin-badge-success">
                <UiText text="已启用" />
              </span>
            </li>
            <li>
              <span>
                <UiText text="媒体上传" />
              </span>
              <span className="admin-badge admin-badge-success">
                <UiText text="已启用" />
              </span>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
