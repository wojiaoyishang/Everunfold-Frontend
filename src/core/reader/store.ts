import {
  readPreviewIdentity,
  readPreviewMetrics,
} from "@/generated/reader-preview-client";
import { RequestError, type RequestOptions } from "@/core/http/request";
import { RequestTasks } from "./tasks";
import {
  emptyReaderSnapshot,
  failureReason,
  type Persona,
  type ReaderSnapshot,
  type LoadState,
} from "./state";

interface ReaderClient {
  identity: typeof readPreviewIdentity;
  metrics: typeof readPreviewMetrics;
}
export interface ReaderStoreOptions {
  client?: ReaderClient;
  timeoutMs?: number;
  freshnessMs?: number;
  batchDelayMs?: number;
  retryDelayMs?: number;
}

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      reject(new RequestError("cancelled"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

/** One owner per mounted public shell; never serializes identity or metrics into a snapshot. */
export class ReaderStore {
  private snapshot: ReaderSnapshot = emptyReaderSnapshot;
  private listeners = new Set<() => void>();
  private controllers = new Set<AbortController>();
  private queue = new Set<string>();
  private metricUsers = new Map<string, { users: number }>();
  private metricGenerations = new Map<string, symbol>();
  private batchTimer: ReturnType<typeof setTimeout> | undefined;
  private epoch = 0;
  private tasks: RequestTasks;
  private lastAttempt = 0;
  private client: ReaderClient;

  constructor(
    readonly baseUrl: string,
    private options: ReaderStoreOptions = {},
  ) {
    this.client = options.client ?? {
      identity: readPreviewIdentity,
      metrics: readPreviewMetrics,
    };
    this.tasks = new RequestTasks(
      (requests) => this.publish({ requests }),
      (load, controller) => this.execute(load, controller),
    );
  }
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => emptyReaderSnapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<ReaderSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    for (const listener of this.listeners) listener();
  }
  private cancel() {
    this.epoch++;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
    clearTimeout(this.batchTimer);
    this.batchTimer = undefined;
    this.queue.clear();
  }
  beginPage(route: string) {
    if (route === this.snapshot.route) return;
    this.cancel();
    this.tasks.clear();
    this.metricUsers.clear();
    this.metricGenerations.clear();
    this.publish({
      route,
      metrics: {},
      identity: { status: "idle" },
      completedAt: null,
    });
  }
  demandMetric(route: string, id: string) {
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) return;
    this.beginPage(route);
    if (this.snapshot.metrics[id]) return;
    this.metricGenerations.set(id, Symbol(id));
    this.publish({
      metrics: {
        ...this.snapshot.metrics,
        [id]: this.snapshot.offline
          ? { status: "error", reason: "网络离线" }
          : { status: "loading" },
      },
    });
    this.tasks.report(`reader:metric:${id}`, this.snapshot.metrics[id]);
    if (this.snapshot.offline) return;
    this.queue.add(id);
    if (!this.batchTimer)
      this.batchTimer = setTimeout(
        () => this.flush(),
        this.options.batchDelayMs ?? 24,
      );
  }
  watchMetric(route: string, id: string) {
    this.beginPage(route);
    const entry = this.metricUsers.get(id) ?? { users: 0 };
    entry.users++;
    this.metricUsers.set(id, entry);
    this.demandMetric(route, id);
    let released = false;
    return () => {
      if (released || this.metricUsers.get(id) !== entry) return;
      released = true;
      if (--entry.users) return;
      this.metricUsers.delete(id);
      this.metricGenerations.delete(id);
      this.queue.delete(id);
      const metrics = { ...this.snapshot.metrics };
      delete metrics[id];
      this.publish({ metrics });
      this.tasks.forget(`reader:metric:${id}`);
    };
  }
  private async execute<T>(
    call: (options: RequestOptions) => Promise<T>,
    controller: AbortController,
  ) {
    this.controllers.add(controller);
    try {
      if (this.snapshot.offline) throw new RequestError("network");
      this.lastAttempt = Date.now();
      const options = {
        signal: controller.signal,
        timeoutMs: this.options.timeoutMs ?? 8000,
      };
      try {
        return await call(options);
      } catch (error) {
        // No automatic retry for validation, permissions, disabled capability or rate limits.
        const retry =
          error instanceof RequestError &&
          (["network", "timeout"].includes(error.kind) ||
            [502, 503, 504].includes(error.status ?? 0));
        if (!retry || controller.signal.aborted) throw error;
        await pause(
          this.options.retryDelayMs ?? 1500 + Math.random() * 300,
          controller.signal,
        );
        return await call(options);
      }
    } finally {
      this.controllers.delete(controller);
    }
  }
  registerTask<T>(
    route: string,
    key: string,
    load: (options: RequestOptions) => Promise<T>,
    onState?: (state: LoadState<T>) => void,
  ) {
    this.beginPage(route);
    return this.tasks.register(key, load, (state) => {
      if (state.status === "ready") this.publish({ completedAt: Date.now() });
      onState?.(state);
    });
  }
  registerIdentity(route: string) {
    return this.registerTask(
      route,
      "reader:identity",
      async (options) => {
        const { persona } = this.snapshot;
        const response = await this.client.identity(
          this.baseUrl,
          { persona },
          options,
        );
        if (response.data.persona !== persona)
          throw new RequestError("invalid");
        return response.data;
      },
      (identity) => this.publish({ identity }),
    );
  }
  private flush() {
    this.batchTimer = undefined;
    const ids = [...this.queue].slice(0, 20);
    ids.forEach((id) => this.queue.delete(id));
    if (this.queue.size)
      this.batchTimer = setTimeout(
        () => this.flush(),
        this.options.batchDelayMs ?? 24,
      );
    if (!ids.length) return;
    const generations = new Map(
      ids.map((id) => [id, this.metricGenerations.get(id)]),
    );
    const currentId = (id: string) =>
      this.metricGenerations.has(id) &&
      this.metricGenerations.get(id) === generations.get(id);
    const token = this.epoch;
    const controller = new AbortController();
    this.lastAttempt = Date.now();
    void this.execute(
      (options) => this.client.metrics(this.baseUrl, { ids }, options),
      controller,
    )
      .then((response) => {
        if (
          token !== this.epoch ||
          controller.signal.aborted ||
          !ids.some(currentId)
        )
          return;
        const result = new Map(
          response.data.items.map((item) => [item.content_id, item]),
        );
        if (
          result.size !== response.data.items.length ||
          [...result.keys()].some((id) => !ids.includes(id))
        )
          throw new RequestError("invalid");
        const metrics = { ...this.snapshot.metrics };
        for (const id of ids) {
          if (!currentId(id)) continue;
          const value = result.get(id);
          metrics[id] = value
            ? { status: "ready", value }
            : { status: "error", reason: "数据暂不可用" };
        }
        this.publish({ metrics, completedAt: Date.now() });
        for (const id of ids)
          if (currentId(id))
            this.tasks.report(`reader:metric:${id}`, metrics[id]);
      })
      .catch((error: unknown) => {
        if (
          token !== this.epoch ||
          controller.signal.aborted ||
          !ids.some(currentId)
        )
          return;
        const metrics = { ...this.snapshot.metrics };
        for (const id of ids)
          if (currentId(id))
            metrics[id] = { status: "error", reason: failureReason(error) };
        this.publish({ metrics });
        for (const id of ids)
          if (currentId(id))
            this.tasks.report(`reader:metric:${id}`, metrics[id]);
      });
  }
  selectPersona(persona: Persona) {
    this.publish({ persona });
    this.tasks.restart("reader:identity");
  }
  refreshTask(route: string, key: string) {
    if (
      this.snapshot.route === route &&
      this.snapshot.requests[key]?.status !== "loading"
    )
      this.tasks.restart(key);
  }
  refresh() {
    const ids = Object.keys(this.snapshot.metrics);
    const route = this.snapshot.route;
    this.cancel();
    this.metricGenerations.clear();
    this.publish({ metrics: {}, completedAt: null });
    this.tasks.refresh();
    for (const id of ids) this.demandMetric(route, id);
  }
  refreshIfStale() {
    if (Date.now() - this.lastAttempt >= (this.options.freshnessMs ?? 30000))
      this.refresh();
  }
  setOnline(online: boolean) {
    if (this.snapshot.offline === !online) return;
    this.publish({ offline: !online });
    this.refresh();
  }
  dispose() {
    this.cancel();
    this.tasks.clear();
    this.metricUsers.clear();
    this.metricGenerations.clear();
    this.snapshot = { ...emptyReaderSnapshot };
  }
}
