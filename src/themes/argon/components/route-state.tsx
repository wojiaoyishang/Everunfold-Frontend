"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useReducer,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Site } from "@/core/content/types";
import type { TableOfContentsItem } from "@/core/rendering/content";
import {
  usePageNavigation,
  type NavigateOptions,
} from "../hooks/use-page-navigation";
import type { NavigationFeedback } from "@/core/navigation/transaction";
import { themeProfile } from "@/core/settings/theme-options";
import {
  reducePagePresentation,
  type PagePresentationData,
} from "@/core/navigation/presentation";

const noHeadings: TableOfContentsItem[] = [];
interface RouteState {
  route: string;
  site: Site;
  toc: TableOfContentsItem[];
  presentationId: string;
  pending: boolean;
  feedback: NavigationFeedback;
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
  const defaultHomeFeed =
    themeProfile(site.settings)?.feed.default_type ?? "all";
  const { pending, feedback, navigate } = usePageNavigation(
    route,
    defaultHomeFeed,
  );
  const [presentation, dispatchPresentation] = useReducer(
    reducePagePresentation,
    { site, current: null },
  );
  const present = useCallback((value: PagePresentationData) => {
    const token = Symbol("page-presentation");
    dispatchPresentation({ type: "register", value, token });
    return () => dispatchPresentation({ type: "release", token });
  }, []);
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
        feedback,
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
  return <span hidden data-page-ready="true" />;
}
