"use client";
import { useEffect, useRef, useState } from "react";
import { controlRuntime } from "@/core/contracts/settings";
import { useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";

/** Explicit registered-task commands are never automatically resubmitted. */
export function useManualWorkerTask() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => () => active.current?.abort(), []);
  const submit = async (
    taskId: string,
    parameters: Record<string, unknown>,
  ) => {
    if (active.current) return null;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      const response = await controlRuntime(
        baseUrl,
        { task_id: taskId, action: "debug_run", parameters },
        csrfToken,
        { signal: controller.signal },
      );
      return controller.signal.aborted ? null : response.data;
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(
          reason instanceof RequestError && reason.status === 403
            ? "没有手动触发此任务的权限。"
            : reason instanceof RequestError && reason.status === 422
              ? "任务参数不符合要求，请检查必填项、类型和取值范围。"
              : reason instanceof RequestError && reason.status === 409
                ? "任务状态已改变或存在不同参数的活动执行，请刷新记录后重试。"
                : reason instanceof RequestError && reason.status === 404
                  ? "任务未启用、不可用或已变更，请刷新任务列表后重试。"
                  : "请求结果尚未确认，请先查看执行记录。",
        );
      }
      return null;
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return { busy, error, submit };
}
