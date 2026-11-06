/** Transport-neutral data boundary. Drivers must use authorized backend operations. */
export interface PluginDataValue<T> {
  resource_id: string;
  scope: "public" | "session";
  source_epoch: string | null;
  revision: number;
  updated_at: string;
  data: T;
}
export interface PluginDataNotice {
  resource_id: string;
  source_epoch: string;
  revision: number;
}
export interface PluginDataDriver<P, T> {
  id: string;
  scope: "public" | "session";
  refresh: (params: P, signal?: AbortSignal) => Promise<PluginDataValue<T>>;
  /** Authenticated invalidation only; session data is always fetched again with the caller's session. */
  subscribe?: (
    params: P,
    listener: (notice: PluginDataNotice) => void,
  ) => () => void;
  request?: (
    params: P,
    operationId: string,
    signal?: AbortSignal,
  ) => Promise<{
    request_id: string;
    accepted_revision: number;
    state: "pending";
  }>;
}

export function createPluginDataSource<P, T>(driver: PluginDataDriver<P, T>) {
  const refresh = async (
    params: P,
    { signal }: { signal?: AbortSignal } = {},
  ) => {
    signal?.throwIfAborted();
    const value = await driver.refresh(params, signal);
    signal?.throwIfAborted();
    if (
      value.resource_id !== driver.id ||
      value.scope !== driver.scope ||
      !Number.isSafeInteger(value.revision) ||
      value.revision < 0
    )
      throw new Error("Invalid plugin data result");
    return value;
  };
  const subscribe = (
    params: P,
    listener: (value: PluginDataValue<T>) => void,
    onError: (error: unknown) => void = () => {},
  ) => {
    if (!driver.subscribe)
      throw new Error("This resource does not provide backend notifications");
    const controller = new AbortController();
    let active = true,
      sequence = 0,
      last: PluginDataNotice | null = null,
      epoch: string | null = null;
    const retired = new Set<string>();
    const stop = driver.subscribe(params, (notice) => {
      if (
        notice.resource_id !== driver.id ||
        !notice.source_epoch ||
        retired.has(notice.source_epoch) ||
        !Number.isSafeInteger(notice.revision) ||
        notice.revision < 0 ||
        (last?.source_epoch === notice.source_epoch &&
          notice.revision <= last.revision)
      )
        return;
      if (epoch && epoch !== notice.source_epoch) retired.add(epoch);
      epoch = notice.source_epoch;
      const request = ++sequence;
      // Notices never carry trusted private payloads. Reauthorize using the normal operation.
      void refresh(params, { signal: controller.signal })
        .then((value) => {
          if (
            active &&
            request === sequence &&
            (value.source_epoch === null ||
              value.source_epoch === notice.source_epoch) &&
            value.revision >= notice.revision
          ) {
            last = notice;
            listener(value);
          }
        })
        .catch((error: unknown) => {
          if (active) onError(error);
        });
    });
    return () => {
      if (!active) return;
      active = false;
      controller.abort();
      stop();
    };
  };
  const wait = (
    params: P,
    options: {
      afterRevision: number;
      sourceEpoch?: string;
      timeoutMs?: number;
      signal?: AbortSignal;
    },
  ) =>
    new Promise<PluginDataValue<T>>((resolve, reject) => {
      let stop = () => {};
      let done = false;
      const finish = (value?: PluginDataValue<T>, error?: unknown) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abort);
        stop();
        if (error) reject(error);
        else resolve(value!);
      };
      const abort = () =>
        finish(
          undefined,
          options.signal?.reason ?? new DOMException("Aborted", "AbortError"),
        );
      const timer = setTimeout(
        () => finish(undefined, new Error("Waiting for plugin data timed out")),
        options.timeoutMs ?? 30000,
      );
      options.signal?.addEventListener("abort", abort, { once: true });
      if (options.signal?.aborted) {
        abort();
        return;
      }
      try {
        stop = subscribe(
          params,
          (value) => {
            if (
              (options.sourceEpoch &&
                value.source_epoch &&
                options.sourceEpoch !== value.source_epoch) ||
              value.revision > options.afterRevision
            )
              finish(value);
          },
          (error) => finish(undefined, error),
        );
        // Subscribe first, then catch up: a callback may arrive between request acceptance and wait().
        void refresh(params, { signal: options.signal })
          .then((value) => {
            if (
              (options.sourceEpoch &&
                value.source_epoch &&
                options.sourceEpoch !== value.source_epoch) ||
              value.revision > options.afterRevision
            )
              finish(value);
          })
          .catch((error: unknown) => finish(undefined, error));
      } catch (error) {
        finish(undefined, error);
      }
    });
  return Object.freeze({
    id: driver.id,
    scope: driver.scope,
    capabilities: Object.freeze({
      refresh: true,
      notifications: Boolean(driver.subscribe),
      deferred: Boolean(driver.request),
    }),
    refresh,
    subscribe,
    wait,
    request: (
      params: P,
      operationId: string,
      { signal }: { signal?: AbortSignal } = {},
    ) => {
      if (!driver.request)
        throw new Error("This resource does not provide deferred operations");
      return driver.request(params, operationId, signal);
    },
  });
}
