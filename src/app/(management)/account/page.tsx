import type { Metadata } from "next";
import { readConfiguration } from "@/core/config/server";
import { AccountPage } from "@/themes/argon/account/page";
import "@/themes/argon/admin/admin.css";
import "@/themes/argon/account/account.css";

export const metadata: Metadata = { title: "账号中心" };
export default function Page() {
  return <AccountPage baseUrl={readConfiguration().backendBaseUrl} />;
}
