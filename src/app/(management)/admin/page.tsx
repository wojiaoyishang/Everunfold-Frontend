import type { Metadata } from "next";
import { readConfiguration } from "@/core/config/server";
import { AdminPage } from "@/themes/argon/management/admin-page";

export const metadata: Metadata = { title: "管理后台" };
export default function AdminRoute() {
  return <AdminPage baseUrl={readConfiguration().backendBaseUrl} />;
}
