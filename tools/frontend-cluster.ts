import cluster, { type Worker } from "node:cluster";
import type { SyncCheck } from "../src/core/contracts/settings";
import type { ReplicaWrite } from "../src/server/settings/receiver";

type Request =
  | { kind: "visit" | "cleared" | "release" }
  | { kind: "acquire" | "status"; id: number };
type Reply = { id: number; status?: SyncCheck };
type Recovery = {
  start(): void;
  visit(): void;
  cleared(): void;
  status(): SyncCheck;
};

export function frontendWorkerCount(raw = "1") {
  if (!/^(?:[1-9]|[12][0-9]|3[0-2])$/.test(raw))
    throw new Error("FRONTEND_WORKERS 必须是 1–32 之间的整数。");
  return Number(raw);
}

/** All workers accept the real TCP peer. Only access to the replica writer is gated. */
export function superviseFrontend(
  root: string,
  exec: string,
  args: string[],
  count: number,
  recovery: Recovery,
  finish: (code: number) => void,
) {
  const workers = new Set<Worker>();
  const queue: Array<{ worker: Worker; id: number }> = [];
  let writer: Worker | undefined;
  let listening = false;
  let closing = false;
  let result = 0;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  function grant() {
    if (writer) return;
    while (queue.length) {
      const { worker, id } = queue.shift()!;
      if (!worker.isConnected()) continue;
      writer = worker;
      worker.send({ id } satisfies Reply, (error) => {
        if (error) worker.process.kill("SIGTERM");
      });
      break;
    }
  }
  function stop(code = 0) {
    if (closing) return;
    closing = true;
    result = code;
    for (const worker of workers) worker.process.kill("SIGTERM");
    deadline = setTimeout(() => {
      result = 1;
      for (const worker of workers) worker.process.kill("SIGKILL");
    }, 31000);
    deadline.unref();
  }
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => stop());

  cluster.setupPrimary({
    cwd: root,
    exec,
    args,
    execArgv: ["--import", "tsx"],
  });
  for (let index = 0; index < count; index++) {
    const worker = cluster.fork({ EVERUNFOLD_CLUSTER_WORKER: "1" });
    workers.add(worker);
    worker.once("listening", () => {
      if (listening || closing) return;
      listening = true;
      recovery.start();
    });
    worker.on("message", (request: Request | null) => {
      if (!request) return;
      switch (request.kind) {
        case "visit":
          recovery.visit();
          break;
        case "cleared":
          recovery.cleared();
          break;
        case "status":
          if (worker.isConnected())
            worker.send(
              { id: request.id, status: recovery.status() } satisfies Reply,
              () => {},
            );
          break;
        case "acquire":
          queue.push({ worker, id: request.id });
          grant();
          break;
        case "release":
          if (writer === worker) {
            writer = undefined;
            grant();
          }
          break;
      }
    });
    worker.on("exit", (code, signal) => {
      workers.delete(worker);
      if (writer === worker) writer = undefined;
      if (!closing) {
        console.error(
          `Everunfold Frontend worker ${worker.process.pid} exited (${signal ?? code})`,
        );
        stop(1);
      } else if (code !== 0 || signal) result = 1;
      grant();
      if (!workers.size) {
        clearTimeout(deadline);
        finish(result);
      }
    });
  }
}

export function frontendClusterClient() {
  if (!cluster.isWorker || process.env.EVERUNFOLD_CLUSTER_WORKER !== "1")
    return;
  const pending = new Map<number, (reply?: Reply) => void>();
  let sequence = 0;
  let lastVisit = -Infinity;
  process.on("message", (reply: Reply | null) => {
    if (reply) pending.get(reply.id)?.(reply);
  });
  process.on("disconnect", () => {
    for (const reject of pending.values()) reject();
  });
  function send(kind: "visit" | "cleared") {
    if (process.connected) process.send?.({ kind } satisfies Request, () => {});
  }
  function ask(kind: "acquire" | "status") {
    return new Promise<Reply>((resolve, reject) => {
      const id = ++sequence;
      const complete = (reply?: Reply) => {
        pending.delete(id);
        if (reply) resolve(reply);
        else reject(new Error("Frontend coordinator disconnected"));
      };
      if (!process.connected || !process.send) return complete();
      pending.set(id, complete);
      process.send({ kind, id } satisfies Request, (error) => {
        if (error) complete();
      });
    });
  }
  const write: ReplicaWrite = async (action) => {
    await ask("acquire");
    try {
      return await action();
    } finally {
      if (process.connected)
        process.send?.({ kind: "release" } satisfies Request, (error) => {
          if (error) process.exit(1);
        });
    }
  };
  return {
    write,
    recovery: {
      visit() {
        const now = Date.now();
        if (now - lastVisit < 1000) return;
        lastVisit = now;
        send("visit");
      },
      cleared: () => send("cleared"),
      async status() {
        const { status } = await ask("status");
        if (!status)
          throw new Error(
            "Frontend coordinator did not return recovery status",
          );
        return status;
      },
    },
  };
}
