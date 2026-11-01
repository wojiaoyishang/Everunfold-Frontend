import Link from "next/link";
import type { ComponentProps } from "react";
/** Framework navigation for code routes; public snapshot navigation uses AppLink. */
export function RouteLink({
  className = "",
  prefetch = false,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props} prefetch={prefetch} className={`ui-link ${className}`} />
  );
}
