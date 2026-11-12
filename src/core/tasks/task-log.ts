import type { TaskProgressEvent } from "@/core/contracts/settings";

export type TaskLogTone =
  "success" | "info" | "stage" | "request" | "response" | "warning" | "error";

export type TaskLogPresentation = {
  badge: string;
  label: string;
  tone: TaskLogTone;
};

export type TaskCompletionLog = {
  badge: string;
  message: string;
  tone: TaskLogTone;
};

export function orderedTaskEvents(events: TaskProgressEvent[]) {
  return [...events].sort((left, right) => left.sequence - right.sequence);
}

export function taskLogPresentation(
  event: Pick<TaskProgressEvent, "kind" | "level">,
): TaskLogPresentation {
  if (event.level === "error")
    return { badge: "ERR", label: "错误", tone: "error" };
  if (event.level === "warning")
    return { badge: "WARN", label: "提示", tone: "warning" };
  if (event.kind === "request")
    return { badge: "REQ", label: "客户端发送", tone: "request" };
  if (event.kind === "response")
    return { badge: "RES", label: "服务器响应", tone: "response" };
  if (event.kind === "stage")
    return { badge: "STEP", label: "进度", tone: "stage" };
  return { badge: "INFO", label: "信息", tone: "info" };
}

export function taskCompletionLog(state: string): TaskCompletionLog | null {
  if (state === "succeeded")
    return { badge: "DONE", message: "任务执行结束", tone: "success" };
  if (state === "failed")
    return { badge: "FAIL", message: "任务执行失败", tone: "error" };
  if (state === "cancelled")
    return { badge: "STOP", message: "任务已取消", tone: "warning" };
  if (state === "unknown")
    return {
      badge: "UNKN",
      message: "任务结果未知，请人工确认",
      tone: "warning",
    };
  return null;
}
