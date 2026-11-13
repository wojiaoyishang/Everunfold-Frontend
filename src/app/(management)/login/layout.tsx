import type { ReactNode } from "react";
import { SiteBrandContext } from "@/core/site/brand";
import { readAppliedSiteBrand } from "@/server/settings/current";
import "@/themes/argon/auth/auth.css";
import "@/themes/argon/auth/scene.css";
import "@/themes/argon/auth/entry.css";
export default async function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  const brand = await readAppliedSiteBrand();
  return (
    <div className="management-root" data-surface="auth">
      <SiteBrandContext
        value={brand && { name: brand.name, icon_url: brand.icon_url }}
      >
        {children}
      </SiteBrandContext>
    </div>
  );
}
