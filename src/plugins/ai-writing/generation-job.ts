import { useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@everunfold/plugin-sdk/client";
import { readGeneration } from "./client";
import type { Generation } from "./contract";

const terminal = (job: Generation) =>
  job.status !== "queued" && job.status !== "running";

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const tick = setTimeout(finish, ms);
    function finish() {
      clearTimeout(tick);
      signal.removeEventListener("abort", finish);
      resolve();
    }
    signal.addEventListener("abort", finish, { once: true });
  });
}

export function useGenerationJob() {
  const admin = useAdminRequest();
  const current = useRef<AbortController>(null);
  const [status, setStatus] = useState<Generation | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [requestId, setRequestId] = useState("");
  useEffect(() => () => current.current?.abort(), []);
  const reset = () => {
    if (current.current) return;
    setStatus(null);
    setFailure(null);
    setRequestId("");
  };

  const run = async (
    id: string,
    start: (signal: AbortSignal) => Promise<Generation> = (signal) =>
      readGeneration(admin, id, signal),
  ) => {
    if (current.current) return;
    const operation = new AbortController();
    current.current = operation;
    const signal = operation.signal;
    setBusy(true);
    setStatus(null);
    setFailure(null);
    setRequestId(id);
    try {
      let job = await start(signal);
      const deadline = Date.now() + 180_000;
      while (!signal.aborted) {
        setStatus(job);
        if (terminal(job)) return;
        if (Date.now() >= deadline) {
          throw new DOMException("Timed out", "TimeoutError");
        }
        await wait(1100, signal);
        signal.throwIfAborted();
        job = await readGeneration(admin, id, signal);
      }
    } catch (error) {
      if (!signal.aborted) setFailure(error);
    } finally {
      current.current = null;
      if (!signal.aborted) setBusy(false);
    }
  };

  return { status, busy, failure, requestId, reset, run };
}
