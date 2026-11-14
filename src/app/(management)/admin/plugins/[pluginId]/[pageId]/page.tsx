import { notFound } from "next/navigation";
import { pluginAdminHref, pluginAdminRoute } from "@/core/plugins/admin-routes";
import { AdminPluginPage } from "@/themes/argon/admin/layout/plugin-page";

export default async function Page({
  params,
}: {
  params: Promise<{ pluginId: string; pageId: string }>;
}) {
  const { pluginId, pageId } = await params;
  if (!pluginAdminRoute(pluginAdminHref(pluginId, pageId))) notFound();
  return <AdminPluginPage pluginId={pluginId} pageId={pageId} />;
}
