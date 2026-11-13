import { AdminPageHeading } from "../components/page-heading";
import { CaptchaSettingsPanel } from "./captcha";
import { SettingsLayout } from "./section-navigation";

export function SystemSettingsPage() {
  return (
    <SettingsLayout>
      <AdminPageHeading title="系统设置" />
      <CaptchaSettingsPanel />
    </SettingsLayout>
  );
}
