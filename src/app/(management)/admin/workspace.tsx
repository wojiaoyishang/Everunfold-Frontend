"use client";
import { useCallback, useState, type ReactNode } from "react";
import { useAdminAccess } from "@/core/admin/use-admin-access";
import {
  AdminAccountContext,
  AdminRequestContext,
} from "@/core/admin/account-context";
import {
  AdminSiteBrandUpdate,
  type AdminSiteBrand,
} from "@/core/admin/site-brand";
import { adminPreferencesKey } from "@/core/admin/preferences";
import { useAdminPreferences } from "@/core/admin/use-admin-preferences";
import { AdminAccessState } from "@/themes/argon/admin/components/access-state";
import { AdminShell } from "@/themes/argon/admin/layout/admin-shell";
import type { AuthUser } from "@/core/contracts/auth";
import { LocalDraftRecovery } from "@/themes/argon/admin/content/local-recovery";
import { AdminSeoContext, type AdminSeo } from "@/core/admin/seo-context";
import { SiteBrandContext } from "@/core/site/brand";

export function AdminWorkspace({
  baseUrl,
  initialBrand,
  seo,
  children,
}: {
  baseUrl: string;
  initialBrand: AdminSiteBrand | null;
  seo: AdminSeo;
  children: ReactNode;
}) {
  const access = useAdminAccess(baseUrl);
  const [confirmedBrand, setConfirmedBrand] = useState<AdminSiteBrand | null>(
    null,
  );
  const updateBrand = useCallback((brand: AdminSiteBrand) => {
    setConfirmedBrand((current) =>
      current && current.revision > brand.revision ? current : brand,
    );
  }, []);
  const brand =
    confirmedBrand && confirmedBrand.revision >= (initialBrand?.revision ?? 0)
      ? confirmedBrand
      : initialBrand;
  if (!access.user && access.recovery)
    return (
      <LocalDraftRecovery recovery={access.recovery} onRetry={access.retry} />
    );
  if (!access.user)
    return (
      <SiteBrandContext value={brand}>
        <AdminAccessState
          error={access.error}
          status={access.status}
          onRetry={access.retry}
        />
      </SiteBrandContext>
    );
  const storageKey = adminPreferencesKey(baseUrl, access.user.id);
  return (
    <SiteBrandContext value={brand}>
      <ConfirmedWorkspace
        key={storageKey}
        storageKey={storageKey}
        baseUrl={baseUrl}
        csrfToken={access.csrfToken}
        user={access.user}
        siteBrand={brand}
        onSignOut={access.signOut}
      >
        <AdminSiteBrandUpdate value={updateBrand}>
          <AdminSeoContext value={seo}>{children}</AdminSeoContext>
        </AdminSiteBrandUpdate>
      </ConfirmedWorkspace>
    </SiteBrandContext>
  );
}
function ConfirmedWorkspace({
  baseUrl,
  csrfToken,
  storageKey,
  user,
  siteBrand,
  onSignOut,
  children,
}: {
  storageKey: string;
  baseUrl: string;
  csrfToken: string;
  user: AuthUser;
  siteBrand: AdminSiteBrand | null;
  onSignOut: () => Promise<void>;
  children: ReactNode;
}) {
  const { preferences, update } = useAdminPreferences(storageKey);
  return (
    <AdminRequestContext value={{ baseUrl, csrfToken }}>
      <AdminAccountContext value={user}>
        <AdminShell
          user={user}
          siteBrand={siteBrand}
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
