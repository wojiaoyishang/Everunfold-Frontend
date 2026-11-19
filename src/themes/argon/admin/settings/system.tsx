"use client";

import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { UiText } from "@/core/i18n/provider";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";
import { CaptchaSettingsPanel } from "./captcha";
import { SettingsLayout } from "./section-navigation";
import { SettingsSection } from "./shared";

export function SystemSettingsPage() {
  const user = useAdminAccount();
  return (
    <SettingsLayout>
      <AdminPageHeading title="系统设置" />
      {can(user, "access:manage") && (
        <SettingsSection id="settings-password-recovery" title="找回密码">
          <RouteLink
            href="/admin/access#access-password-recovery"
            className="admin-settings-link"
          >
            <UiText text="管理找回密码" />
          </RouteLink>
        </SettingsSection>
      )}
      <CaptchaSettingsPanel />
    </SettingsLayout>
  );
}
