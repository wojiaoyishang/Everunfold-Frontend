"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Site } from "@/core/content/types";
import type { TableOfContentsItem } from "@/core/rendering/content";
import { clientNavigationHref } from "@/core/navigation/targets";
import {
  reducePagePresentation,
  type PagePresentationData,
} from "@/core/navigation/presentation";

const noHeadings: TableOfContentsItem[] = [];
interface NavigateOptions {
  replace?: boolean;
  scroll?: boolean;
}
interface RouteState {
  route: string;
  site: Site;
  toc: TableOfContentsItem[];
  presentationId: string;
  pending: boolean;
  navigate: (href: string, options?: NavigateOptions) => void;
  present: (value: PagePresentationData) => () => void;
}
const RouteContext = createContext<RouteState | null>(null);

export function RouteStateProvider({
  site,
  children,
}: {
  site: Site;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const parameters = useSearchParams().toString();
  const route = `${pathname}${parameters ? `?${parameters}` : ""}`;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [presentation, dispatchPresentation] = useReducer(
    reducePagePresentation,
    { site, current: null },
  );
  const present = useCallback((value: PagePresentationData) => {
    const token = Symbol("page-presentation");
    dispatchPresentation({ type: "register", value, token });
    return () => dispatchPresentation({ type: "release", token });
  }, []);
  const navigate = useCallback(
    (href: string, options: NavigateOptions = {}) => {
      startTransition(() => {
        if (options.replace) router.replace(href, { scroll: options.scroll });
        else router.push(href, { scroll: options.scroll });
      });
    },
    [router],
  );
  const current =
    presentation.current?.route === route ? presentation.current : null;
  return (
    <RouteContext.Provider
      value={{
        route,
        site: presentation.site,
        toc: current?.toc ?? noHeadings,
        presentationId: current?.id ?? route,
        pending,
        navigate,
        present,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRouteState() {
  const value = useContext(RouteContext);
  if (!value)
    throw new Error("Reading components must share the persistent blog layout");
  return value;
}

/** Bridge per-page server data into the persistent sidebar after its route commits. */
export function PagePresentation({
  site,
  toc = noHeadings,
  id,
}: {
  site: Site;
  toc?: TableOfContentsItem[];
  id?: string;
}) {
  const { route, present } = useRouteState();
  useLayoutEffect(() => {
    return present({ route, site, toc, id: id ?? route });
  }, [route, site, toc, id, present]);
  return null;
}

export function NavigationProgress() {
  const { pending } = useRouteState();
  return (
    <>
      <div
        className="navigation-progress"
        data-active={pending ? "true" : "false"}
        aria-hidden="true"
      >
        <span />
      </div>
      <div className="navigation-status" role="status" aria-live="polite">
        {pending ? "正在切换页面…" : ""}
      </div>
    </>
  );
}

export function RouteContent({ children }: { children: ReactNode }) {
  const { route, pending, navigate } = useRouteState();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (
      !element ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealState = "visible";
            observer.unobserve(entry.target);
          }
      },
      { rootMargin: "0px 0px 24px 0px", threshold: 0.05 },
    );
    const waiting: HTMLElement[] = [];
    element
      .querySelectorAll<HTMLElement>(".post-card, .archive-month")
      .forEach((item) => {
        if (item.getBoundingClientRect().top > window.innerHeight + 24) {
          item.dataset.revealState = "pending";
          waiting.push(item);
          observer.observe(item);
        }
      });
    return () => {
      observer.disconnect();
      waiting.forEach((item) => {
        if (item.dataset.revealState === "pending")
          delete item.dataset.revealState;
      });
    };
  }, [route, children]);
  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>(
      ".article-content a[href]",
    );
    if (!anchor || !event.currentTarget.contains(anchor)) return;
    const href = clientNavigationHref(window.location.href, anchor.href, {
      button: event.button,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      target: anchor.target,
      download: anchor.hasAttribute("download"),
      external: anchor.relList.contains("external"),
    });
    if (!href) return;
    event.preventDefault();
    navigate(href);
  }
  return (
    <div
      ref={container}
      key={route}
      className="route-transition"
      data-state={pending ? "pending" : "entering"}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
