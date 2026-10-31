import type { ContentPresentation } from "@/generated/presentation-contract";

export type HomeFeedType =
  Extract<ContentPresentation["type"], "article" | "shuoshuo"> | "all";
export const HOME_FEED_KEY = "everunfold.home-feed.v1";
export function homeFeedType(value: unknown): HomeFeedType {
  return value === "article" || value === "shuoshuo" ? value : "all";
}
export function isHomeFeed(url: URL): boolean {
  return (
    url.pathname === "/" &&
    !url.searchParams.has("q") &&
    !url.searchParams.has("s")
  );
}

/** A local preference selects an ordinary public URL, never a personalized SSR/cache entry. */
export function preferredHomeHref(
  href: string,
  currentHref: string,
  preference: HomeFeedType,
): string {
  const current = new URL(currentHref);
  const url = new URL(href, current);
  if (
    url.origin !== current.origin ||
    !isHomeFeed(url) ||
    url.searchParams.has("type") ||
    preference === "all"
  )
    return href;
  url.searchParams.set("type", preference);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function changedHomeFeedHref(
  currentHref: string,
  type: HomeFeedType,
): string | null {
  const url = new URL(currentHref);
  if (!isHomeFeed(url)) return null;
  url.searchParams.set("type", type);
  url.searchParams.delete("page");
  return `${url.pathname}${url.search}${url.hash}`;
}
