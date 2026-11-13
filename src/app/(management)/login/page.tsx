import type { Metadata } from "next";
import { readBrowserBackendBaseUrl } from "@/core/config/server";
import { loginReturnPath } from "@/core/auth/routes";
import { LoginPage } from "@/themes/argon/auth/login-page";

export const metadata: Metadata = { title: "登录" };
export default async function LoginRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;
  return (
    <LoginPage
      baseUrl={await readBrowserBackendBaseUrl()}
      returnTo={loginReturnPath(typeof next === "string" ? next : undefined)}
    />
  );
}
