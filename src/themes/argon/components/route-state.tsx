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
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { scrollToPosition } from "@/core/browser/scroll";
import {
  rememberScrollPosition,
  releaseScrollPosition,
  commitScrollPosition,
  installScrollRestoration,
} from "@/core/browser/scroll-restoration";
import type { Site } from "@/core/content/types";
import type { TableOfContentsItem } from "@/core/rendering/content";
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
  const request = useRef(0);
  useEffect(() => {
    const cancel = () => {
      request.current += 1;
    };
    window.addEventListener("popstate", cancel);
    return () => window.removeEventListener("popstate", cancel);
  }, []);
  useEffect(() => installScrollRestoration(), []);
  useLayoutEffect(() => {
    commitScrollPosition();
  }, [route]);
  useEffect(() => {
    if (!pending) releaseScrollPosition();
  }, [pending]);
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
      const destination = new URL(href, window.location.href);
      if (destination.href === window.location.href) return;
      const id = ++request.current;
      rememberScrollPosition();
      router.prefetch(href);
      startTransition(async () => {
        // Reposition the intact old page before a shorter new document can clamp it.
        if (
          options.scroll !== false &&
          !destination.hash &&
          window.scrollY > 0
        ) {
          const readingTop =
            (document.getElementById("main-content")?.getBoundingClientRect()
              .top ?? 0) +
            window.scrollY -
            95;
          await scrollToPosition(
            destination.pathname === "/" && !destination.search
              ? 0
              : Math.max(0, Math.min(window.scrollY, readingTop)),
            420,
          );
        }
        if (id !== request.current) return;
        startTransition(() => {
          if (options.replace) router.replace(href, { scroll: false });
          else router.push(href, { scroll: false });
        });
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
