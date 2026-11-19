import type { Metadata } from "next";
import { loginReturnPath } from "@/core/auth/routes";
import { readBrowserBackendBaseUrl } from "@/core/config/server";
import { PasswordRecoveryPage } from "@/themes/argon/auth/password-recovery-page";

export const metadata: Metadata = { title: "找回密码" };

export default async function RecoveryRoute({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return (
    <PasswordRecoveryPage
      baseUrl={await readBrowserBackendBaseUrl()}
      returnTo={loginReturnPath(typeof next === "string" ? next : undefined)}
    />
  );
}
