"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/auth/use-session";
import { authFailureMessage } from "@/core/auth/session";
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
import { AccountSessionState } from "./session-state";
import { AccountNavigationProvider, useAccountNavigation } from "./unsaved";

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
      <div
        className="admin-root account-root"
        data-surface="admin"
        data-admin-mode="system"
      >
        <AccountSessionState
          error={state.phase === "failed" ? accountFailure(state.error) : ""}
          onRetry={() => void check()}
        />
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
  const action = useAccountAction((failure) =>
    authFailureMessage(failure, "logout"),
  );
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
          <AccountNavigationProvider>
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
                <nav
                  className="account-site-actions"
                  aria-label={t("站点导航")}
                >
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
                  <AccountLogoutControl
                    busy={action.busy}
                    onLogout={() =>
                      void action.run(async (signal) => {
                        const response = await logout(
                          baseUrl,
                          session.csrf_token,
                          { signal },
                        );
                        if (!signal.aborted) onSession(response.data);
                      })
                    }
                  />
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
                  <AccountTab
                    active={tab === "profile"}
                    onSelect={() => setTab("profile")}
                  >
                    <UiText text="个人资料" />
                  </AccountTab>
                  <AccountTab
                    active={tab === "security"}
                    onSelect={() => setTab("security")}
                  >
                    <UiText text="账号安全" />
                  </AccountTab>
                  <AccountTab
                    active={tab === "keys"}
                    onSelect={() => setTab("keys")}
                  >
                    API Key
                  </AccountTab>
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
                    {tab === "profile" && (
                      <div className="account-panel">
                        <AccountProfileEditor
                          profile={profile}
                          onSaved={(value) => {
                            setProfile(value);
                            onRefresh();
                          }}
                        />
                      </div>
                    )}
                    {tab === "security" && (
                      <div className="account-panel">
                        <AccountSecurity
                          profile={profile}
                          onChanged={(value) => {
                            onSession(value);
                            setReload((revision) => revision + 1);
                          }}
                        />
                      </div>
                    )}
                    {tab === "keys" && (
                      <div className="account-panel">
                        <AccountKeys
                          forcedPassword={profile.must_change_password}
                        />
                      </div>
                    )}
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
          </AccountNavigationProvider>
        </AdminLanguageCatalog>
      </AdminAccountContext>
    </AdminRequestContext>
  );
}

function AccountLogoutControl({
  busy,
  onLogout,
}: {
  busy: boolean;
  onLogout: () => void;
}) {
  const t = useT();
  const navigation = useAccountNavigation();
  return (
    <Button
      className="admin-icon-button"
      aria-label={t("退出登录")}
      disabled={busy || navigation?.busy}
      onClick={() => {
        if (navigation) navigation.request(onLogout);
        else onLogout();
      }}
    >
      <Icon name="logout" />
    </Button>
  );
}

function AccountTab({
  active,
  onSelect,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const navigation = useAccountNavigation();
  return (
    <Button
      aria-pressed={active}
      disabled={navigation?.busy}
      onClick={() => {
        if (active) return;
        if (navigation) navigation.request(onSelect);
        else onSelect();
      }}
    >
      {children}
    </Button>
  );
}
