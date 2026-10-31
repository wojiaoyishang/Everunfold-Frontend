import { NavigationLoadError, type NavigationFailure } from "./document";

export const SLOW_NAVIGATION_MS = 5_000;
export const NAVIGATION_TIMEOUT_MS = 20_000;
export const NAVIGATION_FAILURE_EMPHASIS_MS = 900;
export const NAVIGATION_FAILURE_HOLD_MS = 10_000;
export interface NavigationIntent {
  href: string;
  origin: string;
  replace?: boolean;
  scroll?: boolean;
}
export interface NavigationFeedback {
  id: number;
  phase: "idle" | "loading" | "slow" | "complete" | "failed";
  intent?: NavigationIntent;
  failure?: NavigationFailure;
  attention?: boolean;
}
interface NavigationPorts {
  prepare: (intent: NavigationIntent, signal: AbortSignal) => Promise<void>;
  commit: (intent: NavigationIntent) => void;
  abandon: (intent: NavigationIntent) => void;
}
const routeKey = (href: string, base: string) => {
  const url = new URL(href, base);
  return `${url.pathname}${url.search}`;
};

/** One bounded navigation at a time. Late responses cannot commit or clear newer feedback. */
export class NavigationTransaction {
  private state: NavigationFeedback = { id: 0, phase: "idle" };
  private active: {
    id: number;
    intent: NavigationIntent;
    abort: AbortController;
    committing: boolean;
  } | null = null;
  private listeners = new Set<() => void>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  constructor(private readonly ports: NavigationPorts) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(value: NavigationFeedback) {
    this.state = value;
    this.listeners.forEach((listener) => listener());
  }
  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
  start(intent: NavigationIntent) {
    if (this.active?.intent.href === intent.href) return;
    this.cancel();
    const task = {
      id: this.state.id + 1,
      intent,
      abort: new AbortController(),
      committing: false,
    };
    this.active = task;
    this.publish({ id: task.id, phase: "loading", intent });
    this.timers.push(
      setTimeout(() => {
        if (this.active === task)
          this.publish({ id: task.id, phase: "slow", intent });
      }, SLOW_NAVIGATION_MS),
      setTimeout(() => {
        if (this.active === task) this.fail("timeout");
      }, NAVIGATION_TIMEOUT_MS),
    );
    void this.ports
      .prepare(intent, task.abort.signal)
      .then(() => {
        if (this.active !== task || task.abort.signal.aborted) return;
        task.committing = true;
        this.ports.commit(intent);
      })
      .catch((error: unknown) => {
        if (this.active === task)
          this.fail(
            error instanceof NavigationLoadError ? error.reason : "network",
          );
      });
  }
  complete(route: string): NavigationIntent | null {
    const task = this.active;
    if (
      !task?.committing ||
      routeKey(route, task.intent.origin) !==
        routeKey(task.intent.href, task.intent.origin)
    )
      return null;
    this.active = null;
    this.clearTimers();
    this.publish({ id: task.id, phase: "complete", intent: task.intent });
    this.timers.push(
      setTimeout(() => {
        this.publish({ id: task.id, phase: "idle" });
      }, 480),
    );
    return task.intent;
  }
  fail(failure: NavigationFailure) {
    const task = this.active;
    if (!task) return;
    this.active = null;
    this.clearTimers();
    task.abort.abort();
    if (task.committing) this.ports.abandon(task.intent);
    this.publish({
      id: task.id,
      phase: "failed",
      intent: task.intent,
      failure,
      attention: true,
    });
    // Separate the brief warning cue from the readable hold; stale timers cannot hide a new visit.
    this.timers.push(
      setTimeout(() => {
        if (this.state.id === task.id && this.state.phase === "failed")
          this.publish({ ...this.state, attention: false });
      }, NAVIGATION_FAILURE_EMPHASIS_MS),
      setTimeout(() => {
        if (this.state.id === task.id && this.state.phase === "failed")
          this.publish({ id: task.id, phase: "idle" });
      }, NAVIGATION_FAILURE_EMPHASIS_MS + NAVIGATION_FAILURE_HOLD_MS),
    );
  }
  /** Popstate already supersedes Next's navigation; it must never trigger an extra history write. */
  cancel(rollback = true) {
    const task = this.active;
    this.active = null;
    this.clearTimers();
    task?.abort.abort();
    if (task?.committing && rollback) this.ports.abandon(task.intent);
    if (this.state.phase !== "idle")
      this.publish({ id: this.state.id, phase: "idle" });
  }
}
