import { uploadTransport, type UploadProgress } from "./upload-transport";
import { browserContentLocale, browserLocale } from "@/core/i18n/locale";
/** Browser JSON transport; credentials, caching and desired-state writes stay explicit. */
export type RequestFailure =
  "cancelled" | "timeout" | "network" | "http" | "invalid";
export class RequestError extends Error {
  constructor(
    public readonly kind: RequestFailure,
    public readonly status?: number,
    public readonly code?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(`API request ${kind}`);
    this.name = "RequestError";
  }
}
export interface RequestOptions {
  onUploadProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  headers?: Readonly<Record<string, string>>;
  credentials?: "omit" | "include";
}

export async function requestJSON<T>(
  baseUrl: string,
  path: string,
  query: object,
  validate: (input: unknown) => input is T,
  options: RequestOptions = {},
): Promise<T> {
  return sendJSON(baseUrl, path, query, validate, options);
}

/** Explicit desired-state writes have no automatic retry, unlike page-owned reads. */
export async function mutateJSON<T>(
  baseUrl: string,
  path: string,
  body: object,
  validate: (input: unknown) => input is T,
  options: RequestOptions = {},
): Promise<T> {
  return sendJSON(baseUrl, path, {}, validate, options, body, "PUT");
}

/** Credentialed auth operations opt in explicitly; POST is never automatically retried. */
export async function postJSON<T>(
  baseUrl: string,
  path: string,
  body: object | undefined,
  validate: (input: unknown) => input is T,
  options: RequestOptions = {},
): Promise<T> {
  return sendJSON(baseUrl, path, {}, validate, options, body, "POST");
}

/** Revision-guarded configuration writes; never automatically retried. */
export async function patchJSON<T>(
  baseUrl: string,
  path: string,
  body: object,
  validate: (input: unknown) => input is T,
  options: RequestOptions = {},
): Promise<T> {
  return sendJSON(baseUrl, path, {}, validate, options, body, "PATCH");
}

/** Binary media uploads reuse the same timeout, cancellation and response checks. */
export async function postBinary<T>(
  baseUrl: string,
  path: string,
  query: object,
  file: Blob,
  validate: (input: unknown) => input is T,
  options: RequestOptions = {},
): Promise<T> {
  return sendJSON(
    baseUrl,
    path,
    query,
    validate,
    options,
    undefined,
    "POST",
    file,
  );
}

async function sendJSON<T>(
  baseUrl: string,
  path: string,
  query: object,
  validate: (input: unknown) => input is T,
  {
    signal,
    timeoutMs = 8000,
    fetcher = fetch,
    headers = {},
    credentials = "omit",
    onUploadProgress,
  }: RequestOptions,
  body?: object,
  method: "GET" | "PUT" | "POST" | "PATCH" = "GET",
  binary?: Blob,
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
        const transport =
          binary && onUploadProgress
            ? uploadTransport(onUploadProgress, fetcher)
            : fetcher;
        const response = await transport(url, {
          method,
          credentials,
          cache: "no-store",
          headers: {
            "X-Site-Locale": browserContentLocale(),
            "X-Site-UI-Locale": browserLocale(),
            ...headers,
            Accept: "application/json",
            ...(binary
              ? { "Content-Type": "application/octet-stream" }
              : body === undefined
                ? {}
                : { "Content-Type": "application/json" }),
          },
          body:
            binary ?? (body === undefined ? undefined : JSON.stringify(body)),
          signal: controller.signal,
        });
        if (!response.ok) {
          let code: number | undefined;
          try {
            const failure: unknown = await response.json();
            if (
              failure &&
              typeof failure === "object" &&
              "code" in failure &&
              typeof failure.code === "number"
            )
              code = failure.code;
          } catch {
            /* HTTP status remains authoritative without a JSON error body. */
          }
          const retry = response.headers.get("Retry-After");
          const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : NaN;
          throw new RequestError(
            "http",
            response.status,
            code,
            Number.isSafeInteger(seconds) ? seconds : undefined,
          );
        }
        let result: unknown;
        try {
          result = await response.json();
        } catch {
          throw new RequestError("invalid");
        }
        if (
          !result ||
          typeof result !== "object" ||
          !("success" in result) ||
          result.success !== true ||
          !("code" in result) ||
          result.code !== response.status ||
          !validate(result)
        )
          throw new RequestError("invalid");
        return result;
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
