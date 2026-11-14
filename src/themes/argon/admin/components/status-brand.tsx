"use client";

import { useContext } from "react";
import { defaultSiteName, SiteBrandContext } from "@/core/site/brand";
import { SiteIcon } from "../../components/site-icon";

export function AdminStatusBrand() {
  const brand = useContext(SiteBrandContext);
  return (
    <div className="admin-status-brand">
      <span className="admin-brand-mark" aria-hidden="true">
        <SiteIcon
          url={brand?.icon_url}
          fallback="book"
          size={24}
          className="admin-brand-image"
        />
      </span>
      <span className="admin-eyebrow" dir="auto">
        {brand?.name.trim() || defaultSiteName}
      </span>
    </div>
  );
}
