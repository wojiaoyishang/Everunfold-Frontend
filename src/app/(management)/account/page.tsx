import type { Metadata } from "next";
import { readBrowserBackendBaseUrl } from "@/core/config/server";
import { AccountPage } from "@/themes/argon/account/page";
import { SiteBrandContext } from "@/core/site/brand";
import { readAppliedSiteBrand } from "@/server/settings/current";
import { pageInjectionPluginAvailable } from "@/server/plugins/page-injection";
import "@/themes/argon/admin/admin.css";
import "@/themes/argon/account/account.css";

export const metadata: Metadata = { title: "账号中心" };
export default async function Page() {
  const [baseUrl, brand, pageInjections] = await Promise.all([
    readBrowserBackendBaseUrl(),
    readAppliedSiteBrand(),
    pageInjectionPluginAvailable(),
  ]);
  return (
    <SiteBrandContext value={brand}>
      <AccountPage baseUrl={baseUrl} pageInjections={pageInjections} />
    </SiteBrandContext>
  );
}
