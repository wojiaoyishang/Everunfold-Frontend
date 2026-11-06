"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/auth/use-session";
import { canAccessAdmin } from "@/core/accounts/permissions";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import {
  AdminAccountContext,
  AdminRequestContext,
} from "@/core/admin/account-context";
import { readAccountProfile } from "@/core/contracts/accounts";
import { logout } from "@/core/contracts/auth";
import type { AuthSessionState } from "@/core/contracts/auth";
import type { AccountProfile } from "@/core/contracts/accounts";
import { AdminLanguageCatalog } from "@/core/i18n/admin-languages";
import { adminPreferencesKey } from "@/core/admin/preferences";
import { useAdminPreferences } from "@/core/admin/use-admin-preferences";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../components/ui/primitives";
import { RouteLink } from "../components/ui/route-link";
import { InterfaceLanguage } from "../components/language-switcher";
import { Icon } from "../components/icon";
import { AccountProfileEditor } from "./profile";
import { AccountSecurity } from "./security";
import { AccountKeys } from "./keys";

export function AccountPage({ baseUrl }: { baseUrl: string }) {
  const { state, check, accept } = useSession(baseUrl);
  useEffect(() => {
    const focus = () => void check(true);
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [check]);
  const router = useRouter();
  const anonymous = state.phase === "ready" && !state.session.authenticated;
  useEffect(() => {
    if (anonymous) router.replace("/login?next=%2Faccount");
  }, [anonymous, router]);
  if (state.phase !== "ready" || !state.session.user)
    return (
      <div className="admin-root account-root" data-surface="admin">
        <main className="account-container">
          <p role="status">
            <UiText
              text={
                state.phase === "failed"
                  ? accountFailure(state.error)
                  : "正在确认登录状态"
              }
            />
          </p>
          {state.phase === "failed" && (
            <Button className="admin-button" onClick={() => void check()}>
              <UiText text="重新检查" />
            </Button>
          )}
        </main>
      </div>
    );
  return (
    <ConfirmedAccount
      key={state.session.user.id}
      baseUrl={baseUrl}
      session={state.session}
      onSession={accept}
      onRefresh={() => void check(true)}
    />
  );
}

function ConfirmedAccount({
  baseUrl,
  session,
  onSession,
  onRefresh,
}: {
  baseUrl: string;
  session: AuthSessionState;
  onSession: (session: AuthSessionState) => void;
  onRefresh: () => void;
}) {
  const user = session.user!;
  const t = useT();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState<"profile" | "security" | "keys">(
    user.must_change_password ? "security" : "profile",
  );
  const preferences = useAdminPreferences(
    adminPreferencesKey(baseUrl, user.id),
  );
  const action = useAccountAction();
  useEffect(() => {
    const controller = new AbortController();
    readAccountProfile(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setProfile(data);
          setError("");
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, reload]);
  return (
    <AdminRequestContext value={{ baseUrl, csrfToken: session.csrf_token }}>
      <AdminAccountContext value={user}>
        <AdminLanguageCatalog>
          <div
            className="admin-root account-root"
            data-surface="admin"
            data-admin-mode={preferences.preferences.mode}
            data-admin-motion={preferences.preferences.motion}
          >
            <header className="account-header">
              <RouteLink href="/" className="account-brand">
                <Icon name="leaf" /> Everunfold
              </RouteLink>
              <nav className="account-site-actions" aria-label={t("站点导航")}>
                <RouteLink href="/" className="admin-button">
                  <Icon name="arrow-left" />
                  <UiText text="返回站点" />
                </RouteLink>
                {canAccessAdmin(user) && (
                  <RouteLink href="/admin" className="admin-button">
                    <UiText text="管理后台" />
                  </RouteLink>
                )}
              </nav>
              <nav
                className="account-personal-actions"
                aria-label={t("账号导航")}
              >
                <InterfaceLanguage />
                <Button
                  className="admin-icon-button"
                  aria-label={t("退出登录")}
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async (signal) => {
                      const response = await logout(
                        baseUrl,
                        session.csrf_token,
                        { signal },
                      );
                      if (!signal.aborted) onSession(response.data);
                    })
                  }
                >
                  <Icon name="logout" />
                </Button>
              </nav>
            </header>
            <main className="account-container">
              <div className="account-page-heading">
                <h1>
                  <UiText text="账号中心" />
                </h1>
                <p>{user.display_name || user.username}</p>
              </div>
              <nav className="account-tabs" aria-label={t("账号设置")}>
                <Button
                  aria-pressed={tab === "profile"}
                  onClick={() => setTab("profile")}
                >
                  <UiText text="个人资料" />
                </Button>
                <Button
                  aria-pressed={tab === "security"}
                  onClick={() => setTab("security")}
                >
                  <UiText text="账号安全" />
                </Button>
                <Button
                  aria-pressed={tab === "keys"}
                  onClick={() => setTab("keys")}
                >
                  API Key
                </Button>
              </nav>
              {error ? (
                <div className="account-card" role="alert">
                  <UiText text={error} />
                  <Button
                    className="admin-button"
                    onClick={() => setReload((value) => value + 1)}
                  >
                    <UiText text="重新读取" />
                  </Button>
                </div>
              ) : profile ? (
                <>
                  <div className="account-panel" hidden={tab !== "profile"}>
                    <AccountProfileEditor
                      profile={profile}
                      onSaved={(value) => {
                        setProfile(value);
                        onRefresh();
                      }}
                    />
                  </div>
                  <div className="account-panel" hidden={tab !== "security"}>
                    <AccountSecurity
                      profile={profile}
                      onChanged={(value) => {
                        onSession(value);
                        setReload((revision) => revision + 1);
                      }}
                    />
                  </div>
                  <div className="account-panel" hidden={tab !== "keys"}>
                    <AccountKeys
                      forcedPassword={profile.must_change_password}
                    />
                  </div>
                </>
              ) : (
                <p role="status">
                  <UiText text="正在读取资料…" />
                </p>
              )}
              {action.message && (
                <p role="status">
                  <UiText text={action.message} />
                </p>
              )}
            </main>
          </div>
        </AdminLanguageCatalog>
      </AdminAccountContext>
    </AdminRequestContext>
  );
}
