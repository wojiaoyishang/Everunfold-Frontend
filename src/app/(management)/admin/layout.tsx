import type { Metadata } from "next";
import type { ReactNode } from "react";
import { readConfiguration } from "@/core/config/server";
import { AdminWorkspace } from "./workspace";
import "@/themes/argon/admin/admin.css";
import "@/themes/argon/account/account.css";
export const metadata: Metadata = {
  title: { default: "工作台", template: "%s · Everunfold" },
};
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminWorkspace baseUrl={readConfiguration().backendBaseUrl}>
      {children}
    </AdminWorkspace>
  );
}
