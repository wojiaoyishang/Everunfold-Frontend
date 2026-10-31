export interface NavigationIntent {
  button?: number;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  target?: string | null;
  download?: boolean;
  external?: boolean;
}

const assetPath =
  /\.(?:avif|gif|ico|jpe?g|png|svg|webp|mp[34]|webm|ogg|wav|pdf|zip|gz|tar|7z|docx?|xlsx?|pptx?|txt|csv|json|xml)$/i;

/** Preserve browser gestures and downloads while enhancing local page links. */
export function clientNavigationHref(
  currentHref: string,
  destination: string,
  intent: NavigationIntent = {},
): string | null {
  if (
    (intent.button ?? 0) !== 0 ||
    intent.altKey ||
    intent.ctrlKey ||
    intent.metaKey ||
    intent.shiftKey ||
    intent.download ||
    intent.external ||
    (intent.target && intent.target !== "_self")
  )
    return null;
  let current: URL;
  let next: URL;
  try {
    current = new URL(currentHref);
    next = new URL(destination, current);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(next.protocol) ||
    next.origin !== current.origin ||
    next.username ||
    next.password
  )
    return null;
  if (next.pathname === current.pathname && next.search === current.search)
    return null;
  if (
    /^\/(?:_next|uploads|media|reference|health|api|login|admin)(?:\/|$)/.test(
      next.pathname,
    ) ||
    assetPath.test(next.pathname)
  )
    return null;
  return `${next.pathname}${next.search}${next.hash}`;
}

export function searchHref(value: string): string {
  const query = value.trim().slice(0, 160);
  return query ? `/search?${new URLSearchParams({ q: query })}` : "/search";
}
