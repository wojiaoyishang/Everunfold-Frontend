"use client";
import { useEffect, useRef, useState } from "react";
import {
  readTestMail,
  sendTestMail,
  type MailTestState,
  type SendTestMail,
} from "@/core/contracts/settings";
import { useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";
import { randomUUID } from "@/core/browser/crypto";

export function useMailTest() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [job, setJob] = useState<MailTestState | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false),
    [paused, setPaused] = useState(false);
  const pending = useRef<SendTestMail | null>(null),
    active = useRef<AbortController | null>(null);
  const running = job?.status === "queued" || job?.status === "sending";
  const jobId = job?.id;
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!jobId || !running) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>,
      attempts = 0;
    const poll = async () => {
      try {
        const response = await readTestMail(baseUrl, { id: jobId }, csrfToken, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setJob(response.data);
        if (!["queued", "sending"].includes(response.data.status)) return;
        if (++attempts < 60) timer = setTimeout(poll, 1500);
        else setPaused(true);
      } catch {
        if (!controller.signal.aborted) {
          setPaused(true);
          setError("暂时无法读取发送结果，请刷新状态。");
        }
      }
    };
    timer = setTimeout(poll, 1000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [baseUrl, csrfToken, jobId, running]);
  const send = async (recipient: string, revision: number) => {
    if (active.current || running) return;
    const controller = new AbortController();
    active.current = controller;
    const request = pending.current ?? {
      request_id: randomUUID(),
      expected_revision: revision,
      recipient,
    };
    pending.current = request;
    setBusy(true);
    setJob(null);
    setError("");
    setPaused(false);
    try {
      const response = await sendTestMail(baseUrl, request, csrfToken, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setJob(response.data);
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
  const refresh = async () => {
    if (!job || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const response = await readTestMail(baseUrl, { id: job.id }, csrfToken, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setJob(response.data);
        setError("");
      }
    } catch {
      if (!controller.signal.aborted)
        setError("暂时无法读取发送结果，请刷新状态。");
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return { job, busy, error, running, paused, unconfirmed, send, refresh };
}
