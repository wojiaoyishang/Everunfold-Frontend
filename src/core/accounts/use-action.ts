"use client";
import { useEffect, useRef, useState } from "react";
import { RequestError } from "@/core/http/request";
import { randomUUID } from "@/core/browser/crypto";

export function accountFailure(error: unknown): string {
  if (error instanceof RequestError) {
    if (error.status === 401) return "登录已失效，请重新登录。";
    if (error.code === 42962) return "今日头像上传次数已用完，请等待配额重置。";
    if (error.code === 40966)
      return "个人头像图库已满，请先移除不再需要的图片。";
    if (error.code === 40967) return "请先更换或清除当前头像，再从图库移除。";
    if (error.code === 41365) return "头像文件超过当前上传限制。";
    if (error.code === 42265)
      return "请选择本人图库中的静态 JPG、PNG 或 WebP 图片。";
    if (error.code === 40963) return "必须保留至少一个有效管理员。";
    if (error.code === 40361) return "当前密码不正确。";
    if (error.code === 40970 || error.code === 40470)
      return "身份预设已更新或移除，请刷新后重新选择。";
    if (error.code === 40971) return "身份预设名称已存在。";
    if (error.code === 40370) return "仅管理员可以管理身份预设。";
    if (error.code === 40363) return "请先修改初始密码。";
    if (error.code === 40962) return "用户名已存在。";
    if (error.code === 50360) return "签名服务未就绪，请检查部署配置。";
    if (error.code === 42263) return "请检查应用设置及部署允许的回调来源。";
    if (error.status === 409)
      return "内容已被修改。你的输入已保留，请重新读取后合并更改。";
    if (error.status === 403) return "没有执行此操作的权限。";
    if (error.status === 422) return "请检查必填项、格式、权限及到期时间。";
    if (error.status === 429) return "尝试次数较多，请稍后再试。";
  }
  return "请求未能确认，请检查连接后重试。";
}

/** One in-flight command; an unchanged failed request retains its idempotency ID. */
export function useAccountAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const running = useRef<AbortController | null>(null);
  const receipt = useRef<{ value: string; id: string } | null>(null);
  useEffect(() => () => running.current?.abort(), []);
  const operation = (value: unknown) => {
    const fingerprint = JSON.stringify(value);
    if (!receipt.current || receipt.current.value !== fingerprint)
      receipt.current = { value: fingerprint, id: randomUUID() };
    return receipt.current.id;
  };
  async function run(
    work: (signal: AbortSignal) => Promise<void>,
    success = "已保存。",
  ): Promise<boolean> {
    if (running.current) return false;
    const controller = new AbortController();
    running.current = controller;
    setBusy(true);
    setMessage("");
    try {
      await work(controller.signal);
      if (controller.signal.aborted) return false;
      receipt.current = null;
      setMessage(success);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setMessage(accountFailure(error));
      return false;
    } finally {
      if (running.current === controller) running.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return { busy, message, setMessage, operation, run };
}
