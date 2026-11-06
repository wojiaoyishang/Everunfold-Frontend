import { adminDestination } from "../admin/navigation";

/** Explicit code routes are reachable without a public-content snapshot. */
export function isManagementRoute(pathname: string): boolean {
  return (
    /^\/(?:login|account)\/?$/.test(pathname) || !!adminDestination(pathname)
  );
}

export function isManagementLink(href: string): boolean {
  try {
    return /^\/(?:login|admin|account)(?:\/|$)/.test(
      new URL(href, "https://management.invalid").pathname,
    );
  } catch {
    return false;
  }
}

/** Allow only registered return destinations; this never grants access to them. */
export function loginReturnPath(input: string | undefined): string | undefined {
  // Preserve absence until the backend has confirmed the account's role.
  if (input === undefined || input === "") return undefined;
  if (
    !input.startsWith("/") ||
    input.startsWith("//") ||
    /[\u0000-\u001f\u007f\\]/.test(input)
  )
    return "/";
  try {
    const url = new URL(input, "https://management.invalid");
    if (
      url.origin !== "https://management.invalid" ||
      (url.pathname !== "/" &&
        !/^\/account\/?$/.test(url.pathname) &&
        !adminDestination(url.pathname))
    )
      return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

/** A login page is shared by readers and administrators; this never grants permission. */
export function loginDestination(
  returnTo: string | undefined,
  isAdmin: boolean,
  forcePassword = false,
): string {
  if (forcePassword) return "/account";
  const target = loginReturnPath(returnTo);
  if (target === undefined) return isAdmin ? "/admin" : "/";
  return target.startsWith("/admin") && !isAdmin ? "/" : target;
}
