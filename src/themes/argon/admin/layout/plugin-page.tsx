"use client";

import { createElement } from "react";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import type { PluginAdminPageProps } from "@/core/plugins/admin-page-types";
import { useAdminPluginRuntime } from "@/core/plugins/runtime/context";
import { OptionalPluginBoundary } from "@/core/plugins/runtime/optional-component";
import { UiText } from "@/core/i18n/provider";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";

export function AdminPluginPage({ pluginId, pageId }: PluginAdminPageProps) {
  const { catalog, loading, adminPages, components } = useAdminPluginRuntime();
  const user = useAdminAccount();
  const registration = adminPages.find(
    (item) => item.pluginId === pluginId && item.id === pageId,
  );
  const Page =
    registration && components.get(pluginId)?.[registration.component];
  if (loading)
    return (
      <p className="admin-panel" role="status">
        <UiText text="正在加载工作区内容" />
      </p>
    );
  if (!registration || !Page)
    return (
      <section className="admin-panel">
        <AdminPageHeading title="此插件页面不可用" />
        <RouteLink href="/admin" className="admin-button">
          <UiText text="工作台" />
        </RouteLink>
      </section>
    );
  if (!can(user, registration.permission, null))
    return (
      <section className="admin-panel">
        <AdminPageHeading title="没有访问此页面的权限" />
      </section>
    );
  const build = catalog?.plugins.find(
    (plugin) => plugin.id === pluginId,
  )?.build;
  return (
    <>
      <AdminPageHeading title={registration.label} />
      <OptionalPluginBoundary
        key={`${pluginId}:${pageId}:${build}`}
        fallback={
          <p className="admin-panel" role="alert">
            <UiText text="此插件页面不可用" />
          </p>
        }
      >
        {createElement(Page, { pluginId, pageId })}
      </OptionalPluginBoundary>
    </>
  );
}
