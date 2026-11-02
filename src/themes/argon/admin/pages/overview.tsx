"use client";
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
            <h2>内容管理</h2>
          </div>
          <Icon name="arrow" />
        </RouteLink>
        <RouteLink href="/admin/media" showPending className="admin-shortcut">
          <span className="admin-shortcut-icon">
            <Icon name="image" />
          </span>
          <div>
            <h2>媒体库</h2>
          </div>
          <Icon name="arrow" />
        </RouteLink>
      </div>
      <div className="admin-overview-grid">
        <section className="admin-panel">
          <header>
            <h2>当前账户</h2>
            <span className="admin-badge admin-badge-success">
              <Icon name="check" /> 已登录
            </span>
          </header>
          <dl className="admin-details">
            <div>
              <dt>显示名称</dt>
              <dd>{user.display_name}</dd>
            </div>
            <div>
              <dt>用户名</dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>账户角色</dt>
              <dd>管理员</dd>
            </div>
          </dl>
        </section>
        <section className="admin-panel">
          <header>
            <h2>工作空间状态</h2>
          </header>
          <ul className="admin-capabilities">
            <li>
              <span>账号访问</span>
              <span className="admin-badge admin-badge-success">已启用</span>
            </li>
            <li>
              <span>草稿编辑</span>
              <span className="admin-badge admin-badge-success">已启用</span>
            </li>
            <li>
              <span>媒体上传</span>
              <span className="admin-badge admin-badge-success">已启用</span>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
