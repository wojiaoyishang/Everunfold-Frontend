import type { Metadata } from "next";
import { readBrowserBackendBaseUrl } from "@/core/config/server";
import { RegistrationPage } from "@/themes/argon/auth/registration-page";

export const metadata: Metadata = { title: "注册账号" };

export default async function RegistrationRoute() {
  return <RegistrationPage baseUrl={await readBrowserBackendBaseUrl()} />;
}
