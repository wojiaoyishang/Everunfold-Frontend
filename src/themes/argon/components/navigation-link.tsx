"use client";

import Link from "next/link";
import Form from "next/form";
import type { ComponentProps, FormEvent, ReactNode } from "react";
import { clientNavigationHref, searchHref } from "@/core/navigation/targets";
import { useRouteState } from "./route-state";
import { useNavigation } from "./navigation-state";

type AppLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/** Keep Next's prefetching and browser gestures, sharing only the pending transition. */
export function AppLink({
  href,
  replace,
  scroll,
  onNavigate,
  ...props
}: AppLinkProps) {
  const { navigate } = useRouteState();
  return (
    <Link
      {...props}
      href={href}
      replace={replace}
      scroll={scroll}
      onNavigate={(event) => {
        let canceled = false;
        onNavigate?.({
          preventDefault() {
            canceled = true;
            event.preventDefault();
          },
        });
        if (canceled) return;
        const destination = clientNavigationHref(window.location.href, href);
        if (!destination) return;
        event.preventDefault();
        navigate(destination, { replace, scroll });
      }}
    />
  );
}

/** Next Form retains native GET behavior when JavaScript is unavailable. */
export function SearchForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { navigate } = useRouteState();
  const { setOpen } = useNavigation();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (event.defaultPrevented) return;
    const value = new FormData(event.currentTarget).get("q");
    if (typeof value !== "string") return;
    event.preventDefault();
    setOpen(false);
    navigate(searchHref(value));
  }
  return (
    <Form action="/search" className={className} onSubmit={onSubmit}>
      {children}
    </Form>
  );
}
