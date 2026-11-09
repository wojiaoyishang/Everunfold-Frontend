"use client";
import { useCallback, useEffect, useState } from "react";
import {
  watchTaskProgress,
  type TaskProgress,
  type TaskProgressEvent,
} from "@/core/contracts/settings";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";
import { clearRecentTaskIds } from "./recent-task";

export type TaskIdentity = Pick<TaskProgress, "resource" | "id">;
export type TaskMonitor = ReturnType<typeof useTaskProgress>;
const activeStates = new Set(["queued", "running"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Retain only the most recent task ID, scoped to this backend and confirmed account. */
export function useRecentTaskId(slot: string) {
  const { baseUrl } = useAdminRequest();
  const user = useAdminAccount();
  const key = `everunfold:task:${baseUrl}:${user.id}:${slot}`;
  const [stored, setStored] = useState<{ key: string; id: string } | null>(
    null,
  );
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      try {
        const id = sessionStorage.getItem(key) ?? "";
        setStored({ key, id: uuid.test(id) ? id : "" });
      } catch {
        setStored({ key, id: "" });
      }
    });
    return () => {
      mounted = false;
    };
  }, [key]);
  const remember = useCallback(
    (id: string) => {
      if (id && !uuid.test(id)) return;
      try {
        if (id) sessionStorage.setItem(key, id);
        else sessionStorage.removeItem(key);
      } catch {
        // Monitoring remains available when browser storage is disabled.
      }
      setStored({ key, id });
    },
    [key],
  );
  return [stored?.key === key ? stored.id : "", remember] as const;
}

/** Ordered durable reads: reconnect resumes the cursor, never reruns the task. */
export function useTaskProgress(identity: TaskIdentity | null) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const user = useAdminAccount();
  const resource = identity?.resource,
    id = identity?.id;
  const scope = `${baseUrl}:${user.id}:${resource ?? ""}:${id ?? ""}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    scope: string;
    data: TaskProgress | null;
    events: TaskProgressEvent[];
    connection: "connecting" | "live" | "reconnecting" | "paused" | "stopped";
    error: string;
    truncated: boolean;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    data: TaskProgress;
    events: TaskProgressEvent[];
    truncated: boolean;
  } | null>(null);
  useEffect(() => {
    if (!resource || !id) return;
    let disposed = false,
      controller: AbortController | null = null,
      timer: ReturnType<typeof setTimeout> | undefined,
      attempts = 0,
      cursor = 0,
      events: TaskProgressEvent[] = [],
      latest: TaskProgress | null = null,
      truncated = false,
      terminal = false;
    const publish = (
      connection: NonNullable<typeof state>["connection"],
      error = "",
    ) => {
      if (!disposed)
        setState({ scope, data: latest, events, connection, error, truncated });
    };
    const schedule = (delay: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => void poll(), delay);
    };
    const poll = async () => {
      if (disposed || controller || terminal) return;
      if (document.hidden) {
        publish("paused");
        return;
      }
      controller = new AbortController();
      try {
        const response = await watchTaskProgress(
          baseUrl,
          {
            resource,
            id,
            after_sequence: cursor,
            wait_seconds: latest ? 15 : 0,
          },
          csrfToken,
          { signal: controller.signal, timeoutMs: 25000 },
        );
        if (disposed || controller.signal.aborted) return;
        latest = response.data;
        cursor = latest.cursor;
        const merged = new Map(events.map((event) => [event.sequence, event]));
        for (const event of latest.events) merged.set(event.sequence, event);
        const all = [...merged.values()].sort(
          (a, b) => a.sequence - b.sequence,
        );
        truncated ||= all.length > 1000;
        events = all.slice(-1000);
        attempts = 0;
        terminal = !activeStates.has(latest.state) && !latest.has_more;
        publish(terminal ? "stopped" : "live");
        setSnapshot({ scope, data: latest, events, truncated });
        if (!terminal) schedule(latest.has_more ? 0 : 150);
      } catch (reason) {
        if (disposed || controller.signal.aborted) return;
        if (
          reason instanceof RequestError &&
          [401, 403, 404].includes(reason.status ?? 0)
        ) {
          terminal = true;
          if (reason.status === 401 || reason.status === 403)
            clearRecentTaskIds(baseUrl, user.id);
          latest = null;
          events = [];
          setSnapshot(null);
          publish(
            "stopped",
            reason.status === 404
              ? "任务记录不存在或已清理。"
              : "无法继续查看任务，请确认登录和访问权限。",
          );
        } else {
          publish(
            "reconnecting",
            "连接暂时中断，正在重新连接；任务仍可能继续执行。",
          );
          schedule(Math.min(15000, 1000 * 2 ** Math.min(attempts++, 4)));
        }
      } finally {
        const wasAborted = controller.signal.aborted;
        controller = null;
        if (wasAborted && !disposed && !document.hidden && !terminal)
          schedule(0);
      }
    };
    const visibility = () => {
      if (document.hidden) {
        controller?.abort();
        clearTimeout(timer);
        publish("paused");
      } else if (!terminal) schedule(0);
    };
    document.addEventListener("visibilitychange", visibility);
    schedule(0);
    return () => {
      disposed = true;
      controller?.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [baseUrl, csrfToken, user.id, resource, id, scope, revision]);
  const current = state?.scope === scope ? state : null;
  const previous = snapshot?.scope === scope ? snapshot : null;
  const data = current?.data ?? previous?.data ?? null;
  return {
    data,
    events: current?.events ?? previous?.events ?? [],
    connection: current?.connection ?? (id ? "connecting" : "stopped"),
    error: current?.error ?? "",
    truncated: current?.truncated ?? previous?.truncated ?? false,
    running: data
      ? activeStates.has(data.state)
      : !!id && current?.connection !== "stopped",
    refresh: () => setRevision((value) => value + 1),
  };
}
