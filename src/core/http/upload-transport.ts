/** Upload transport selection happens before sending; a sent request is never replayed. */
export interface UploadProgress {
  loaded: number;
  total: number | null;
  complete?: boolean;
}
export function uploadTransport(
  onProgress: (progress: UploadProgress) => void,
  fallback: typeof fetch = fetch,
  factory: (() => XMLHttpRequest) | undefined = typeof XMLHttpRequest ===
  "undefined"
    ? undefined
    : () => new XMLHttpRequest(),
): typeof fetch {
  return (input, init = {}) => {
    const xhr = factory?.();
    if (!xhr?.upload || !("onprogress" in xhr.upload)) {
      onProgress({ loaded: 0, total: null });
      return fallback(input, init);
    }
    return new Promise<Response>((resolve, reject) => {
      const signal = init.signal;
      const cleanup = () => signal?.removeEventListener("abort", abort);
      const abort = () => {
        xhr.abort();
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal?.aborted) {
        abort();
        return;
      }
      xhr.open(init.method ?? "POST", String(input), true);
      xhr.withCredentials = init.credentials === "include";
      new Headers(init.headers).forEach((value, key) =>
        xhr.setRequestHeader(key, value),
      );
      xhr.upload.onprogress = (event) =>
        onProgress({
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : null,
        });
      xhr.upload.onload = () =>
        onProgress({
          loaded: init.body instanceof Blob ? init.body.size : 0,
          total: null,
          complete: true,
        });
      xhr.onload = () => {
        cleanup();
        if (!xhr.status) {
          reject(new TypeError("Upload response unavailable"));
          return;
        }
        resolve(
          new Response(xhr.responseText, {
            status: xhr.status,
            headers: { "Content-Type": "application/json" },
          }),
        );
      };
      xhr.onerror = () => {
        cleanup();
        reject(new TypeError("Upload network failure"));
      };
      xhr.onabort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      onProgress({ loaded: 0, total: null });
      try {
        xhr.send(init.body as Blob);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  };
}
