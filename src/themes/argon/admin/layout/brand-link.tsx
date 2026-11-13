"use client";

import type { AdminSiteBrand } from "@/core/admin/site-brand";
import { defaultSiteName } from "@/core/site/brand";
import { useT } from "@/core/i18n/provider";
import { SiteIcon } from "../../components/site-icon";
import { RouteLink } from "../../components/ui/route-link";

export function AdminBrandLink({
  brand,
  onClick,
}: {
  brand: AdminSiteBrand | null;
  onClick?: () => void;
}) {
  const t = useT();
  const name = brand?.name.trim() || defaultSiteName;
  return (
    <RouteLink
      href="/admin"
      className="admin-brand"
      aria-label={t("{site} 工作台", { site: name })}
      title={name}
      onClick={onClick}
    >
      <span className="admin-brand-mark" aria-hidden="true">
        <SiteIcon
          url={brand?.icon_url}
          fallback="book"
          size={24}
          className="admin-brand-image"
        />
      </span>
      <span className="admin-brand-label" dir="auto">
        {name}
      </span>
    </RouteLink>
  );
}
