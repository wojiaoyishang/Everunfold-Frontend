import { randomUUID } from "@/core/browser/crypto";
import type { UploadProgress } from "../http/upload-transport";
import { RequestError } from "../http/request";
export class InvalidUpload extends Error {}
export type UploadState =
  "queued" | "uploading" | "saving" | "done" | "failed" | "cancelled";
export interface UploadEntry<T> {
  id: string;
  name: string;
  context?: string;
  size: number;
  state: UploadState;
  percent: number | null;
  error?: string;
  retryable?: boolean;
  result?: T;
}
interface Job<P> {
  file: File;
  context: string;
  payload?: P;
  controller?: AbortController;
}
interface Handler<T, P> {
  prepare(file: File, context: string): Promise<P>;
  send(
    payload: P,
    signal: AbortSignal,
    progress: (value: UploadProgress) => void,
  ): Promise<T>;
  completed(result: T, entry: { id: string; context: string }): void;
  rejected: string;
}
/** Shared by every upload surface. Stable payloads survive retries; individual failures are isolated. */
export class UploadQueue<T, P> {
  private entries: UploadEntry<T>[] = [];
  private jobs = new Map<string, Job<P>>();
  private listeners = new Set<() => void>();
  private active = 0;
  private disposed = false;
  constructor(
    private handler: Handler<T, P>,
    private concurrency = 2,
  ) {}
  setCompleted(callback: Handler<T, P>["completed"]) {
    this.handler.completed = callback;
  }
  snapshot = () => this.entries;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    this.listeners.forEach((listener) => listener());
  }
  private patch(id: string, change: Partial<UploadEntry<T>>) {
    this.entries = this.entries.map((item) =>
      item.id === id ? { ...item, ...change } : item,
    );
    this.emit();
  }
  add(files: File[], context: string) {
    if (this.disposed) return;
    const added = files.map((file) => {
      const id = randomUUID();
      this.jobs.set(id, { file, context });
      return {
        id,
        name: file.name,
        context,
        size: file.size,
        state: "queued" as const,
        percent: null,
      };
    });
    this.entries = [...this.entries, ...added];
    this.emit();
    this.pump();
    return added;
  }
  retry(id: string) {
    const item = this.entries.find((entry) => entry.id === id);
    if (
      !item ||
      !["failed", "cancelled"].includes(item.state) ||
      item.retryable === false ||
      !this.jobs.has(id)
    )
      return;
    this.patch(id, { state: "queued", error: undefined, percent: null });
    this.pump();
  }
  cancel(id: string) {
    const item = this.entries.find((entry) => entry.id === id);
    if (!item || !["queued", "uploading", "saving"].includes(item.state))
      return;
    this.patch(id, { state: "cancelled", percent: null, retryable: true });
    this.jobs.get(id)?.controller?.abort();
  }
  clearFinished(ids?: string[]) {
    const selected = ids ? new Set(ids) : null;
    const finished = this.entries.filter(
      (item) =>
        ["done", "failed", "cancelled"].includes(item.state) &&
        (!selected || selected.has(item.id)),
    );
    finished.forEach((item) => this.jobs.delete(item.id));
    this.entries = this.entries.filter(
      (item) => !finished.some((entry) => entry.id === item.id),
    );
    this.emit();
  }
  start() {
    this.disposed = false;
    this.pump();
  }
  dispose() {
    this.disposed = true;
    this.entries.forEach((item) => this.cancel(item.id));
  }
  private pump() {
    if (this.disposed) return;
    while (this.active < this.concurrency) {
      const entry = this.entries.find(
        (item) =>
          item.state === "queued" && !this.jobs.get(item.id)?.controller,
      );
      if (!entry) break;
      this.active++;
      void this.run(entry.id);
    }
  }
  private async run(id: string) {
    const job = this.jobs.get(id)!;
    const controller = new AbortController();
    job.controller = controller;
    this.patch(id, { state: "uploading", percent: null });
    try {
      job.payload ??= await this.handler.prepare(job.file, job.context);
      if (controller.signal.aborted) return;
      const result = await this.handler.send(
        job.payload,
        controller.signal,
        (value) => {
          if (!controller.signal.aborted)
            this.patch(id, {
              state: value.complete ? "saving" : "uploading",
              percent: value.total
                ? Math.min(100, Math.floor((value.loaded / value.total) * 100))
                : null,
            });
        },
      );
      if (controller.signal.aborted) return;
      this.patch(id, { state: "done", percent: 100, result });
      this.jobs.delete(id);
      this.handler.completed(result, { id, context: job.context });
    } catch (error) {
      if (!controller.signal.aborted) {
        const rejected =
          error instanceof InvalidUpload ||
          (error instanceof RequestError &&
            [400, 401, 403, 409, 410, 413, 415, 422].includes(
              error.status ?? 0,
            ));
        this.patch(id, {
          state: "failed",
          percent: null,
          retryable: !rejected,
          error:
            error instanceof InvalidUpload
              ? error.message
              : error instanceof RequestError &&
                  [401, 403].includes(error.status ?? 0)
                ? "登录状态已失效，请重新登录"
                : rejected
                  ? this.handler.rejected
                  : "上传未完成，请重试",
        });
      }
    } finally {
      job.controller = undefined;
      this.active--;
      this.pump();
    }
  }
}
