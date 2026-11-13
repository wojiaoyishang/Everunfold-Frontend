import type { Metadata } from "next";
import type { ReactNode } from "react";
import { readBrowserBackendBaseUrl } from "@/core/config/server";
import { readAppliedSettings } from "@/server/settings/current";
import { AdminWorkspace } from "./workspace";
import "@/themes/argon/admin/admin.css";
import "@/themes/argon/account/account.css";
export const metadata: Metadata = {
  title: { default: "工作台", template: "%s · Everunfold" },
};
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [baseUrl, applied] = await Promise.all([
    readBrowserBackendBaseUrl(),
    readAppliedSettings().catch(() => null),
  ]);
  const site = applied?.publicSettings?.site;
  return (
    <AdminWorkspace
      baseUrl={baseUrl}
      initialBrand={
        site && applied
          ? {
              name: site.name,
              icon_url: site.icon_url,
              revision: applied.revision,
            }
          : null
      }
    >
      {children}
    </AdminWorkspace>
  );
}
