"use client";

import Link from "next/link";
import Form from "next/form";
import type { ComponentProps, FormEvent, ReactNode } from "react";
import { clientNavigationHref, searchHref } from "@/core/navigation/targets";
import { useRouteState } from "./route-state";
import { useNavigation } from "./navigation-state";
import { navigateToAnchor } from "@/core/browser/scroll-restoration";
import { isManagementLink } from "@/core/auth/routes";
import { useLocale, useLanguageCatalog } from "@/core/i18n/provider";
import { localizeHref, localeOf, localePath } from "@/core/i18n/locale";
import { normalizePath } from "@/core/content/urls";

type AppLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  expectedContent?: boolean;
};

/** Keep Next's prefetching and browser gestures, sharing only the pending transition. */
export function AppLink({
  href: sourceHref,
  replace,
  scroll,
  onNavigate,
  onClick,
  expectedContent,
  ...props
}: AppLinkProps) {
  const { navigate, site } = useRouteState();
  const { locale, preferred } = useLocale();
  const catalog = useLanguageCatalog();
  const originalHref = sourceHref;
  const publicContent = site.contentTranslations?.[
    normalizePath(new URL(originalHref, "http://locale.invalid").pathname)
  ]?.find((item) => item.language === preferred);
  const href = site.contentLocales?.[
    normalizePath(new URL(sourceHref, "http://locale.invalid").pathname)
  ]
    ? (publicContent?.path ?? sourceHref)
    : localizeHref(sourceHref, preferred, catalog);
  const contentLocale =
    site.contentLocales?.[
      normalizePath(new URL(href, "http://locale.invalid").pathname)
    ] ?? localePath(new URL(href, "http://locale.invalid").pathname, catalog);
  return (
    <Link
      {...props}
      prefetch={isManagementLink(href) ? false : props.prefetch}
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
        if (isManagementLink(href)) {
          event.preventDefault();
          window.location.assign(href);
          return;
        }
        if (contentLocale && localeOf(contentLocale) !== locale) {
          event.preventDefault();
          window.location.assign(href);
          return;
        }
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
  const { locale } = useLocale();
  const catalog = useLanguageCatalog();
  const { setOpen } = useNavigation();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (event.defaultPrevented) return;
    const values = new FormData(event.currentTarget);
    const value = values.get("q");
    if (typeof value !== "string") return;
    event.preventDefault();
    setOpen(false);
    onSearch?.();
    const url = new URL(
      localizeHref(searchHref(value), locale, catalog),
      window.location.origin,
    );
    const type = values.get("type");
    if (type === "article" || type === "shuoshuo" || type === "page")
      url.searchParams.set("type", type);
    const languages = values.get("languages");
    if (typeof languages === "string" && languages && languages !== locale)
      url.searchParams.set("languages", languages);
    navigate(`${url.pathname}${url.search}`);
  }
  return (
    <Form
      action={localizeHref("/search", locale, catalog)}
      className={className}
      onSubmit={onSubmit}
    >
      {children}
    </Form>
  );
}
