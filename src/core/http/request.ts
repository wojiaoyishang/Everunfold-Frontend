/** Browser GET transport; credentials and response caching are explicit per capability. */
export type RequestFailure =
  "cancelled" | "timeout" | "network" | "http" | "invalid";
export class RequestError extends Error {
  constructor(
    public readonly kind: RequestFailure,
    public readonly status?: number,
  ) {
    super(`Reader request ${kind}`);
    this.name = "RequestError";
  }
}
export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export async function requestJSON<T>(
  baseUrl: string,
  path: string,
  query: object,
  validate: (input: unknown) => input is T,
  { signal, timeoutMs = 8000, fetcher = fetch }: RequestOptions = {},
): Promise<T> {
  const url = new URL(path, `${baseUrl}/`);
  for (const [key, input] of Object.entries(query)) {
    if (input === undefined) continue;
    for (const value of Array.isArray(input) ? input : [input])
      url.searchParams.append(key, String(value));
  }
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(() => {
    timedOut = true;
    abort();
  }, timeoutMs);
  let removeAbort = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    const rejectAbort = () =>
      reject(new RequestError(timedOut ? "timeout" : "cancelled"));
    controller.signal.addEventListener("abort", rejectAbort, { once: true });
    removeAbort = () =>
      controller.signal.removeEventListener("abort", rejectAbort);
    if (controller.signal.aborted) rejectAbort();
  });
  try {
    return await Promise.race([
      cancelled,
      (async () => {
        if (controller.signal.aborted) throw new RequestError("cancelled");
        const response = await fetcher(url, {
          method: "GET",
          credentials: "omit",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new RequestError("http", response.status);
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          throw new RequestError("invalid");
        }
        if (
          !body ||
          typeof body !== "object" ||
          !("success" in body) ||
          body.success !== true ||
          !("code" in body) ||
          body.code !== response.status ||
          !validate(body)
        )
          throw new RequestError("invalid");
        return body;
      })(),
    ]);
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (controller.signal.aborted)
      throw new RequestError(timedOut ? "timeout" : "cancelled");
    throw new RequestError("network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    removeAbort();
  }
}
