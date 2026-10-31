import type { ReaderPreviewContract } from "@/generated/reader-preview-contract";
import { RequestError } from "@/core/http/request";

export type Identity = ReaderPreviewContract["identity"]["data"];
export type Metric = ReaderPreviewContract["metrics"]["data"]["items"][number];
export type Persona = Identity["persona"];
export type LoadState<T> =
  | { status: "idle" | "loading" }
  | { status: "ready"; value: T }
  | { status: "error"; reason: string };
export interface ReaderSnapshot {
  route: string;
  offline: boolean;
  persona: Persona;
  identity: LoadState<Identity>;
  metrics: Record<string, LoadState<Metric>>;
  requests: Record<string, LoadState<unknown>>;
  completedAt: number | null;
}
export const emptyReaderSnapshot: ReaderSnapshot = {
  route: "",
  offline: false,
  persona: "guest",
  identity: { status: "idle" },
  metrics: {},
  requests: {},
  completedAt: null,
};
export function readerPhase(snapshot: ReaderSnapshot) {
  if (snapshot.offline) return "offline";
  const states = Object.values(snapshot.requests);
  if (!states.length) return "idle";
  if (states.some((value) => value.status === "loading")) return "updating";
  if (states.some((value) => value.status === "error"))
    return states.some((value) => value.status === "ready")
      ? "partial"
      : "unavailable";
  return states.every((value) => value.status === "ready") ? "ready" : "idle";
}

/** Settled page capabilities, including failures; never an estimate of bytes transferred. */
export function readerProgress(snapshot: ReaderSnapshot) {
  const states = Object.values(snapshot.requests);
  const settled = states.filter(
    (state) => state.status === "ready" || state.status === "error",
  ).length;
  const failed = states.filter((state) => state.status === "error").length;
  return {
    total: states.length,
    settled,
    failed,
    fraction: states.length ? settled / states.length : 0,
  };
}
export function failureReason(error: unknown) {
  if (!(error instanceof RequestError)) return "暂时无法更新";
  if (error.kind === "timeout") return "请求超时";
  if (error.kind === "invalid") return "数据格式不匹配";
  if (error.status === 404) return "该请求暂不可用";
  if (error.status === 429) return "请求较多，请稍后再试";
  return "暂时无法连接";
}
