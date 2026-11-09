"use client";
import { useEffect, useRef, useState } from "react";
import {
  readTestMail,
  sendTestMail,
  type MailTestState,
  type SendTestMail,
} from "@/core/contracts/settings";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";
import { randomUUID } from "@/core/browser/crypto";
import {
  useRecentTaskId,
  useTaskProgress,
} from "@/core/tasks/use-task-progress";

export function useMailTest() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const user = useAdminAccount();
  const requestScope = `${baseUrl}:${user.id}`;
  const [identity, remember] = useRecentTaskId("mail-test");
  const [job, setJob] = useState<MailTestState | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false);
  const pending = useRef<{ scope: string; request: SendTestMail } | null>(null),
    active = useRef<AbortController | null>(null);
  const progress = useTaskProgress(
    identity ? { resource: "mail-test", id: identity } : null,
  );
  const finalState = progress.data?.state;
  const currentJob = job?.id === identity ? job : null;
  const running = progress.running;
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!identity) return;
    const controller = new AbortController();
    void readTestMail(baseUrl, { id: identity }, csrfToken, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) setJob(response.data);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (
          reason instanceof RequestError &&
          [401, 403, 404].includes(reason.status ?? 0)
        ) {
          remember("");
          setJob(null);
          setError("任务记录不存在、已清理或无权访问，请重新确认登录。");
        }
      });
    return () => controller.abort();
  }, [baseUrl, csrfToken, identity, finalState, remember]);
  const send = async (recipient: string, revision: number) => {
    if (active.current || running) return;
    const controller = new AbortController();
    active.current = controller;
    const request = (pending.current?.scope === requestScope
      ? pending.current.request
      : null) ?? {
      request_id: randomUUID(),
      expected_revision: revision,
      recipient,
    };
    pending.current = { scope: requestScope, request };
    setBusy(true);
    setError("");
    try {
      const response = await sendTestMail(baseUrl, request, csrfToken, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setJob(response.data);
      remember(response.data.id);
      pending.current = null;
      setUnconfirmed(false);
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (
        reason instanceof RequestError &&
        [401, 403, 409, 422, 429].includes(reason.status ?? 0)
      ) {
        pending.current = null;
        setUnconfirmed(false);
        setError(
          reason.status === 429
            ? "测试过于频繁，请一分钟后重试。"
            : reason.status === 409
              ? "配置已改变，请重新读取配置后测试。"
              : reason.status === 422
                ? "请先保存完整的 SMTP 配置，再测试发件。"
                : "没有测试发件权限或登录已失效。",
        );
      } else {
        setUnconfirmed(true);
        setError("请求结果尚未确认，请点击确认请求；重复确认不会重复发信。");
      }
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return {
    job: currentJob,
    busy,
    error,
    running,
    progress,
    identity,
    unconfirmed,
    send,
  };
}
