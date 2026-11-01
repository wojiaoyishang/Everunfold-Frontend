"use client";
import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function RoutePending() {
  const { pending } = useLinkStatus();
  return (
    <span className="ui-route-pending" data-pending={pending}>
      <span aria-hidden="true" className="ui-route-pending-ring" />
      <span className="ui-route-pending-label" role="status">
        {pending ? "正在打开页面" : ""}
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
  ...props
}: ComponentProps<typeof Link> & { showPending?: boolean }) {
  return (
    <Link {...props} prefetch={prefetch} className={`ui-link ${className}`}>
      {children}
      {showPending && <RoutePending />}
    </Link>
  );
}
