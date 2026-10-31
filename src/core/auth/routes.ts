/** Explicit code routes are reachable without a public-content snapshot. */
export function isManagementRoute(pathname: string): boolean {
  return /^\/(?:login|admin)\/?$/.test(pathname);
}

export function isManagementLink(href: string): boolean {
  try {
    return /^\/(?:login|admin)(?:\/|$)/.test(
      new URL(href, "https://management.invalid").pathname,
    );
  } catch {
    return false;
  }
}

/** Only implemented management destinations may be used after a credential exchange. */
export function adminReturnPath(input: string | undefined): string {
  if (
    !input ||
    !input.startsWith("/") ||
    input.startsWith("//") ||
    /[\u0000-\u001f\u007f\\]/.test(input)
  )
    return "/admin";
  try {
    const url = new URL(input, "https://management.invalid");
    if (
      url.origin !== "https://management.invalid" ||
      url.pathname !== "/admin"
    )
      return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/admin";
  }
}
