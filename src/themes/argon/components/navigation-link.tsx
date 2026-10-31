"use client";

import Link from "next/link";
import Form from "next/form";
import type { ComponentProps, FormEvent, ReactNode } from "react";
import { clientNavigationHref, searchHref } from "@/core/navigation/targets";
import { useRouteState } from "./route-state";
import { useNavigation } from "./navigation-state";
import { navigateToAnchor } from "@/core/browser/scroll-restoration";

type AppLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  expectedContent?: boolean;
};

/** Keep Next's prefetching and browser gestures, sharing only the pending transition. */
export function AppLink({
  href,
  replace,
  scroll,
  onNavigate,
  onClick,
  expectedContent,
  ...props
}: AppLinkProps) {
  const { navigate } = useRouteState();
  return (
    <Link
      {...props}
      href={href}
      replace={replace}
      scroll={scroll}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.download ||
          (props.target && props.target !== "_self")
        )
          return;
        const url = new URL(href, window.location.href);
        if (
          url.origin === window.location.origin &&
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash &&
          navigateToAnchor(url)
        )
          event.preventDefault();
      }}
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
        navigate(destination, { replace, scroll, expectedContent });
      }}
    />
  );
}

/** Next Form retains native GET behavior when JavaScript is unavailable. */
export function SearchForm({
  children,
  className,
  onSearch,
}: {
  children: ReactNode;
  className?: string;
  onSearch?: () => void;
}) {
  const { navigate } = useRouteState();
  const { setOpen } = useNavigation();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (event.defaultPrevented) return;
    const values = new FormData(event.currentTarget);
    const value = values.get("q");
    if (typeof value !== "string") return;
    event.preventDefault();
    setOpen(false);
    onSearch?.();
    const url = new URL(searchHref(value), window.location.origin);
    const type = values.get("type");
    if (type === "article" || type === "shuoshuo" || type === "page")
      url.searchParams.set("type", type);
    navigate(`${url.pathname}${url.search}`);
  }
  return (
    <Form action="/search" className={className} onSubmit={onSubmit}>
      {children}
    </Form>
  );
}
