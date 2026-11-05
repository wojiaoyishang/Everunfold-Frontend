"use client";
import { UiText } from "@/core/i18n/provider";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { isManagementLink } from "@/core/auth/routes";

function RoutePending() {
  const { pending } = useLinkStatus();
  return (
    <span className="ui-route-pending" data-pending={pending}>
      <span aria-hidden="true" className="ui-route-pending-ring" />
      <span className="ui-route-pending-label" role="status">
        {pending ? <UiText text="正在打开页面" /> : ""}
      </span>
    </span>
  );
}

/** Framework navigation for code routes; public snapshot navigation uses AppLink. */
export function RouteLink({
  className = "",
  prefetch = false,
  showPending = false,
  children,
  onNavigate,
  ...props
}: ComponentProps<typeof Link> & { showPending?: boolean }) {
  return (
    <Link
      {...props}
      prefetch={prefetch}
      className={`ui-link ${className}`}
      onNavigate={(event) => {
        let cancelled = false;
        onNavigate?.({
          preventDefault() {
            cancelled = true;
            event.preventDefault();
          },
        });
        if (cancelled || typeof props.href !== "string") return;
        const target = new URL(props.href, location.href);
        if (
          isManagementLink(target.pathname) !==
          isManagementLink(location.pathname)
        ) {
          event.preventDefault();
          location.assign(target.href);
        }
      }}
    >
      {children}
      {showPending && <RoutePending />}
    </Link>
  );
}
