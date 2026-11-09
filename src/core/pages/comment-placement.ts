import type { PageCommentsPlacement } from "./registration";

/** Resolve only descendants of the current page, including late plugin renders. */
export function pageCommentsTarget(
  scope: HTMLElement,
  options: PageCommentsPlacement | undefined,
) {
  const body = scope.querySelector<HTMLElement>("[data-managed-page-body]");
  if (!body) return null;
  const anchor = body.querySelector<HTMLElement>("[data-page-comments-slot]");
  if (anchor) return anchor;
  if (!options?.selector) return null;
  try {
    const target = body.querySelector<HTMLElement>(options.selector);
    return target &&
      !target.closest(
        "header,nav,iframe,script,style,[data-page-comments-host],[data-ui-area='admin']",
      )
      ? target
      : null;
  } catch {
    // Invalid or temporarily absent plugin targets retain the page-end fallback.
    return null;
  }
}

export function showPageCommentsFallback(
  options: PageCommentsPlacement | undefined,
) {
  return options?.placement !== "manual" || Boolean(options.selector);
}

/** The portal container is browser-owned, not a node in React's child tree. */
export function placePageCommentsHost(
  root: HTMLElement,
  home: HTMLElement,
  host: HTMLElement,
  options: PageCommentsPlacement | undefined,
) {
  const target = pageCommentsTarget(root, options);
  const destination = target ?? home;
  if (host.parentElement !== destination) {
    const focused = host.ownerDocument.activeElement;
    const restoreFocus =
      focused instanceof HTMLElement && host.contains(focused);
    destination.append(host);
    if (restoreFocus) focused.focus({ preventScroll: true });
  }
  const hidden = !target && !showPageCommentsFallback(options);
  if (host.hidden !== hidden) host.hidden = hidden;
  return !hidden;
}
