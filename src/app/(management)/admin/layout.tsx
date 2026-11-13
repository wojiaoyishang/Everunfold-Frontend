import type { Metadata } from "next";
import type { ReactNode } from "react";
import { readBrowserBackendBaseUrl } from "@/core/config/server";
import { readAppliedSiteBrand } from "@/server/settings/current";
import { readAdminSeo } from "@/server/settings/seo";
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
  const [baseUrl, initialBrand, seo] = await Promise.all([
    readBrowserBackendBaseUrl(),
    readAppliedSiteBrand(),
    readAdminSeo(),
  ]);
  return (
    <AdminWorkspace baseUrl={baseUrl} initialBrand={initialBrand} seo={seo}>
      {children}
    </AdminWorkspace>
  );
}
