export type NavigationFailure =
  "timeout" | "network" | "not-found" | "unavailable" | "render";

export class NavigationLoadError extends Error {
  constructor(readonly reason: NavigationFailure) {
    super(reason);
  }
}

/** Public document preparation, not a business API or a second content cache.
 * Consume the entire body: receiving response headers alone is not readiness.
 */
export async function prepareNavigationDocument(
  href: string,
  signal: AbortSignal,
  request: typeof fetch = fetch,
): Promise<void> {
  const response = await request(href, {
    signal,
    cache: "no-store",
    credentials: "same-origin",
    redirect: "error",
    headers: { Accept: "text/html", "X-Everunfold-Navigation": "prepare" },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new NavigationLoadError(
      response.status === 404 ? "not-found" : "unavailable",
    );
  }
  if (!response.headers.get("content-type")?.includes("text/html")) {
    await response.body?.cancel();
    throw new NavigationLoadError("unavailable");
  }
  const html = await response.text();
  if (!/<span\b[^>]*data-page-ready="true"[^>]*>/.test(html))
    throw new NavigationLoadError("render");
  signal.throwIfAborted();
}
