"use client";

import { useState } from "react";
import type { AdminSiteBrand } from "@/core/admin/site-brand";
import { resourceUrl } from "@/core/content/urls";
import { useT } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { RouteLink } from "../../components/ui/route-link";

export function AdminBrandLink({
  brand,
  onClick,
}: {
  brand: AdminSiteBrand | null;
  onClick?: () => void;
}) {
  const t = useT();
  const name = brand?.name.trim() || "Everunfold";
  const icon = resourceUrl(brand?.icon_url);
  return (
    <RouteLink
      href="/admin"
      className="admin-brand"
      aria-label={t("{site} 工作台", { site: name })}
      title={name}
      onClick={onClick}
    >
      <AdminBrandMark key={icon} icon={icon} />
      <span className="admin-brand-label" dir="auto">
        {name}
      </span>
    </RouteLink>
  );
}

function AdminBrandMark({ icon }: { icon: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="admin-brand-mark" aria-hidden="true">
      {icon && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- Site icon URLs can use any configured HTTP(S) host.
        <img
          className="admin-brand-image"
          src={icon}
          alt=""
          width={24}
          height={24}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon name="book" />
      )}
    </span>
  );
}
