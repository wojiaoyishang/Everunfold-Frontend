import type { RequestOptions } from "@/core/http/request";
import { failureReason, type LoadState } from "./state";

type Executor = <T>(
  load: (options: RequestOptions) => Promise<T>,
  controller: AbortController,
) => Promise<T>;
interface RegisteredTask {
  users: number;
  start: () => void;
  stop: () => void;
}

/** Page-owned requests register here; the status surface does not know their business fields. */
export class RequestTasks {
  private entries = new Map<string, RegisteredTask>();
  private states: Record<string, LoadState<unknown>> = {};
  constructor(
    private changed: (states: Record<string, LoadState<unknown>>) => void,
    private execute: Executor,
  ) {}

  report(key: string, state: LoadState<unknown>) {
    this.states = { ...this.states, [key]: state };
    this.changed(this.states);
  }
  register<T>(
    key: string,
    load: (options: RequestOptions) => Promise<T>,
    onState?: (state: LoadState<T>) => void,
  ) {
    const previous = this.entries.get(key);
    let task: RegisteredTask;
    if (previous) {
      previous.users++;
      task = previous;
    } else {
      let controller: AbortController | undefined;
      const emit = (state: LoadState<T>) => {
        this.report(key, state);
        onState?.(state);
      };
      task = {
        users: 1,
        stop: () => controller?.abort(),
        start: () => {
          controller?.abort();
          const current = new AbortController();
          controller = current;
          emit({ status: "loading" });
          void this.execute(load, current)
            .then((value) => {
              if (!current.signal.aborted) emit({ status: "ready", value });
            })
            .catch((error: unknown) => {
              if (!current.signal.aborted)
                emit({ status: "error", reason: failureReason(error) });
            });
        },
      };
      this.entries.set(key, task);
      task.start();
    }
    let released = false;
    return () => {
      if (released || this.entries.get(key) !== task) return;
      released = true;
      if (--task.users > 0) return;
      task.stop();
      this.entries.delete(key);
      const next = { ...this.states };
      delete next[key];
      this.states = next;
      this.changed(next);
    };
  }
  restart(key: string) {
    this.entries.get(key)?.start();
  }
  forget(key: string) {
    if (this.entries.has(key)) return;
    const next = { ...this.states };
    delete next[key];
    this.states = next;
    this.changed(next);
  }
  refresh() {
    this.states = {};
    this.changed(this.states);
    for (const task of this.entries.values()) task.start();
  }
  clear() {
    for (const task of this.entries.values()) task.stop();
    this.entries.clear();
    this.states = {};
    this.changed(this.states);
  }
}
