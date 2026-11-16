import type { SyncCheck } from "@/core/contracts/settings";
import {
  SyncValidationError,
  syncFailure,
  syncTarget,
} from "../sync-diagnostics";
import { readReplicas } from "./receiver";

type Backend = {
  baseUrl: string;
  nodeId: string;
  token: string;
  timeoutMs: number;
};

async function queuedResult(
  response: Response,
  nodeId: string,
): Promise<boolean | undefined> {
  const reader = response.body?.getReader();
  if (!reader) return;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > 8192) return;
      chunks.push(item.value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (
      body?.success === true &&
      body?.code === 200 &&
      body?.data?.node_id === nodeId &&
      typeof body?.data?.queued === "boolean"
    )
      return body.data.queued;
  } finally {
    await reader.cancel();
  }
}

export function replicaRecovery({
  intervalSeconds,
  settings,
  content,
  backend,
}: {
  intervalSeconds: number;
  settings: Parameters<typeof readReplicas>[0];
  content: NonNullable<Parameters<typeof readReplicas>[1]>;
  backend: () => Backend | undefined;
}) {
  const intervalMs = intervalSeconds * 1000;
  const visitIntervalMs = Math.min(intervalMs, 5000);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let checking = false;
  let clearedDuringCheck = false;
  let lastChecked: number | undefined;
  let nextCheck: number | undefined;
  let lastRequest: number | undefined;
  let state: SyncCheck["state"] = "idle";

  async function check(): Promise<void> {
    const context: Parameters<typeof syncFailure>[0] = {
      direction: "frontend_to_backend",
      operation: "POST /internal/frontend-nodes/{node_id}/recover",
    };
    let failure = "recovery_config_invalid";
    try {
      const replicas = await readReplicas(settings, content);
      lastChecked = Date.now();
      if (Object.values(replicas).every(({ status }) => status === "ready")) {
        state = "ready";
        return;
      }
      // Many visits can observe the same gap before the backend Worker publishes.
      if (lastRequest !== undefined && lastChecked - lastRequest < intervalMs) {
        if (state === "ready") state = "waiting";
        return;
      }
      lastRequest = lastChecked;
      const target = backend();
      if (!target) {
        state = "idle";
        return;
      }
      context.node_id = target.nodeId;
      const url = `${target.baseUrl}/internal/frontend-nodes/${encodeURIComponent(target.nodeId)}/recover`;
      context.target = syncTarget(url);
      failure = "recovery_token_missing";
      if (!/^[!-~]{32,}$/.test(target.token))
        throw new SyncValidationError(failure);
      failure = "backend_network";
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${target.token}` },
        redirect: "manual",
        signal: AbortSignal.timeout(target.timeoutMs),
      });
      context.status = response.status;
      if (response.status !== 200) {
        failure =
          response.status === 403 ? "recovery_forbidden" : "backend_http";
        await response.body?.cancel();
        throw new SyncValidationError(failure);
      }
      failure = "recovery_invalid_response";
      const queued = await queuedResult(response, target.nodeId);
      if (queued === undefined) throw new SyncValidationError(failure);
      state = queued ? "queued" : "waiting";
    } catch (error) {
      state = "error";
      syncFailure(context, failure, error);
    }
  }

  function schedule(delay: number) {
    if (!running || checking) return;
    const target = Date.now() + delay;
    if (nextCheck !== undefined && nextCheck <= target) return;
    clearTimeout(timer);
    nextCheck = target;
    timer = setTimeout(() => {
      nextCheck = undefined;
      checking = true;
      void check().finally(() => {
        checking = false;
        const delay = clearedDuringCheck ? 0 : intervalMs;
        clearedDuringCheck = false;
        schedule(delay);
      });
    }, delay);
    timer.unref();
  }

  return {
    start() {
      running = true;
      schedule(intervalMs);
    },
    stop() {
      running = false;
      clearTimeout(timer);
      nextCheck = undefined;
    },
    visit() {
      if (
        lastChecked === undefined ||
        Date.now() - lastChecked >= visitIntervalMs
      )
        schedule(0);
    },
    cleared() {
      // An authenticated clear is a new loss of replicas, even after a recent probe.
      lastRequest = undefined;
      if (checking) clearedDuringCheck = true;
      schedule(0);
    },
    status(): SyncCheck {
      return {
        interval_seconds: intervalSeconds,
        last_checked_at:
          lastChecked === undefined
            ? null
            : new Date(lastChecked).toISOString(),
        next_check_at:
          nextCheck === undefined ? null : new Date(nextCheck).toISOString(),
        state,
      };
    },
  };
}
