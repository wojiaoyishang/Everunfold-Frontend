import type { Metadata } from "next";
import { readBrowserBackendBaseUrl } from "@/core/config/server";
import { PasswordRecoveryPage } from "@/themes/argon/auth/password-recovery-page";

export const metadata: Metadata = { title: "找回密码" };

export default async function RecoveryRoute() {
  return <PasswordRecoveryPage baseUrl={await readBrowserBackendBaseUrl()} />;
}
