import type { Metadata } from "next";
import { readConfiguration } from "@/core/config/server";
import { PasswordRecoveryPage } from "@/themes/argon/auth/password-recovery-page";

export const metadata: Metadata = { title: "找回密码" };

export default function RecoveryRoute() {
  return <PasswordRecoveryPage baseUrl={readConfiguration().backendBaseUrl} />;
}
