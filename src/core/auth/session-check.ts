import type { AuthSessionState } from "@/generated/auth-contract";
import { RequestError } from "@/core/http/request";
import { checkedSession } from "./session";

export type SessionView =
  | { phase: "checking" }
  | { phase: "ready"; session: AuthSessionState }
  | { phase: "failed"; error: unknown };

/** One private page owns one check. Focus/restore events cannot restart its deadline. */
export function createSessionCheck(
  read: (signal: AbortSignal) => Promise<AuthSessionState>,
  publish: (state: SessionView) => void,
  admin = false,
) {
  let disposed = false;
  let pending:
    { controller: AbortController; result: Promise<void> } | undefined;

  function cancel() {
    pending?.controller.abort();
    pending = undefined;
  }

  return {
    check(background = false): Promise<void> {
      if (disposed) return Promise.resolve();
      if (pending) return pending.result;
      const controller = new AbortController();
      if (!background) publish({ phase: "checking" });
      const result = Promise.resolve().then(async () => {
        if (controller.signal.aborted) return;
        try {
          const session = checkedSession(await read(controller.signal), admin);
          if (!disposed && !controller.signal.aborted)
            publish({ phase: "ready", session });
        } catch (error) {
          if (!disposed && !controller.signal.aborted)
            publish({
              phase: "failed",
              error: error ?? new RequestError("network"),
            });
        } finally {
          if (pending?.controller === controller) pending = undefined;
        }
      });
      pending = { controller, result };
      return result;
    },
    accept(session: AuthSessionState) {
      const validated = checkedSession(session, admin);
      cancel();
      if (!disposed) publish({ phase: "ready", session: validated });
    },
    fail(error: unknown) {
      cancel();
      if (!disposed)
        publish({
          phase: "failed",
          error: error ?? new RequestError("network"),
        });
    },
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
