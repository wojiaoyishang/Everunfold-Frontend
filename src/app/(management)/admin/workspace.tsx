"use client";
import type { ReactNode } from "react";
import { useAdminAccess } from "@/core/admin/use-admin-access";
import {
  AdminAccountContext,
  AdminRequestContext,
} from "@/core/admin/account-context";
import { adminPreferencesKey } from "@/core/admin/preferences";
import { useAdminPreferences } from "@/core/admin/use-admin-preferences";
import { AdminAccessState } from "@/themes/argon/admin/components/access-state";
import { AdminShell } from "@/themes/argon/admin/layout/admin-shell";
import type { AuthUser } from "@/core/contracts/auth";
import { LocalDraftRecovery } from "@/themes/argon/admin/content/local-recovery";

export function AdminWorkspace({
  baseUrl,
  children,
}: {
  baseUrl: string;
  children: ReactNode;
}) {
  const access = useAdminAccess(baseUrl);
  if (!access.user && access.recovery)
    return (
      <LocalDraftRecovery recovery={access.recovery} onRetry={access.retry} />
    );
  if (!access.user)
    return (
      <AdminAccessState
        error={access.error}
        status={access.status}
        onRetry={access.retry}
      />
    );
  const storageKey = adminPreferencesKey(baseUrl, access.user.id);
  return (
    <ConfirmedWorkspace
      key={storageKey}
      storageKey={storageKey}
      baseUrl={baseUrl}
      csrfToken={access.csrfToken}
      user={access.user}
      onSignOut={access.signOut}
    >
      {children}
    </ConfirmedWorkspace>
  );
}
function ConfirmedWorkspace({
  baseUrl,
  csrfToken,
  storageKey,
  user,
  onSignOut,
  children,
}: {
  storageKey: string;
  baseUrl: string;
  csrfToken: string;
  user: AuthUser;
  onSignOut: () => Promise<void>;
  children: ReactNode;
}) {
  const { preferences, update } = useAdminPreferences(storageKey);
  return (
    <AdminRequestContext value={{ baseUrl, csrfToken }}>
      <AdminAccountContext value={user}>
        <AdminShell
          user={user}
          preferences={preferences}
          onPreferencesChange={update}
          onSignOut={onSignOut}
        >
          {children}
        </AdminShell>
      </AdminAccountContext>
    </AdminRequestContext>
  );
}
