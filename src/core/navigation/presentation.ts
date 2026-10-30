import type { Site } from "@/core/content/types";
import type { TableOfContentsItem } from "@/core/rendering/content";

export interface PagePresentationData {
  route: string;
  site: Site;
  toc: TableOfContentsItem[];
  id: string;
}

export interface PagePresentationState {
  site: Site;
  current: (PagePresentationData & { token: symbol }) | null;
}

type PresentationAction =
  | { type: "register"; value: PagePresentationData; token: symbol }
  | { type: "release"; token: symbol };

/** An old page's cleanup must never erase a newer page's sidebar registration. */
export function reducePagePresentation(
  state: PagePresentationState,
  action: PresentationAction,
): PagePresentationState {
  if (action.type === "register") {
    return {
      site: action.value.site,
      current: { ...action.value, token: action.token },
    };
  }
  return state.current?.token === action.token
    ? { ...state, current: null }
    : state;
}
