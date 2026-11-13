"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readAdminSession } from "@/core/contracts/auth";
import {
  authorizeLocalNodeOperation,
  readNodesMonitor,
  type MonitorStatus,
  type NodeProofRequest,
} from "@/core/contracts/settings";
import { RequestError } from "@/core/http/request";
import { nodesConsolePath } from "@/core/auth/routes";
import type { LocalGate, LocalNode } from "./local";

type OnlineIdentity = {
  base: string;
  csrf: string;
  nodeId: string;
};

type ConsoleView =
  | { mode: "loading" | "disabled" | "unavailable" | "sign-in" | "forbidden" }
  | { mode: "locked"; passwordConfigured: boolean }
  | { mode: "offline"; local: LocalNode }
  | {
      mode: "online";
      identity: OnlineIdentity;
      fleet: MonitorStatus;
      local?: LocalNode;
    };

class LocalRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function requestLocal<T>(
  body?: object,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(nodesConsolePath + "/local", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    signal,
  });
  const value = await response.json();
  if (!response.ok)
    throw new LocalRequestError(
      response.status,
      value.error ?? "前端诊断暂不可用",
    );
  return value as T;
}

async function runOnline<T>(
  identity: OnlineIdentity,
  payload: NodeProofRequest,
  signal?: AbortSignal,
) {
  const { data: proof } = await authorizeLocalNodeOperation(
    identity.base,
    payload,
    identity.csrf,
    { signal },
  );
  return requestLocal<T>(
    {
      action: payload.intent,
      profile: payload.profile,
      revision: payload.revision,
      challenge: payload.challenge,
      proof,
    },
    signal,
  );
}

export function nodeError(error: unknown): string {
  if (error instanceof LocalRequestError) return error.message;
  if (error instanceof RequestError && error.status === 401)
    return "管理员会话已失效，请重新登录";
  if (error instanceof RequestError && error.status === 403)
    return "此操作需要管理员权限";
  if (error instanceof RequestError && error.status === 404)
    return "本机节点尚未在后端启用";
  return "暂时无法完成操作，请刷新后重试";
}

export function useNodeConsole() {
  const [view, setView] = useState<ConsoleView>({ mode: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const active = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const { signal } = controller;
    const publish = (next: ConsoleView) => {
      if (!signal.aborted) setView(next);
    };
    setRefreshing(true);
    try {
      const gate = await requestLocal<LocalGate>(undefined, signal);
      if (gate.mode === "unavailable") return publish({ mode: "unavailable" });
      if (gate.mode === "offline") {
        if (!gate.unlocked)
          return publish({
            mode: "locked",
            passwordConfigured: gate.passwordConfigured,
          });
        const local = await requestLocal<LocalNode>(
          { action: "inspect" },
          signal,
        );
        return publish({ mode: "offline", local });
      }
      if (
        !gate.backendBaseUrl ||
        !gate.nodeId ||
        !gate.profile ||
        !gate.revision ||
        !gate.challenge
      )
        return publish({ mode: "unavailable" });
      const { data: session } = await readAdminSession(gate.backendBaseUrl, {
        signal,
      });
      if (
        !session.authenticated ||
        session.user?.role !== "admin" ||
        session.user.must_change_password
      )
        return publish({ mode: "forbidden" });
      const identity = {
        base: gate.backendBaseUrl,
        csrf: session.csrf_token,
        nodeId: gate.nodeId,
      };
      const [{ data: fleet }, local] = await Promise.all([
        readNodesMonitor(identity.base, { signal, timeoutMs: 12000 }),
        runOnline<LocalNode>(
          identity,
          {
            intent: "inspect",
            node_id: identity.nodeId,
            profile: gate.profile,
            revision: gate.revision,
            challenge: gate.challenge,
          },
          signal,
        ).catch(() => undefined),
      ]);
      publish({ mode: "online", identity, fleet, local });
    } catch (error) {
      if (error instanceof LocalRequestError && error.status === 404)
        publish({ mode: "disabled" });
      else if (error instanceof RequestError && error.status === 401)
        publish({ mode: "sign-in" });
      else if (error instanceof RequestError && error.status === 403)
        publish({ mode: "forbidden" });
      else publish({ mode: "unavailable" });
    } finally {
      if (active.current === controller) {
        active.current = null;
        if (!signal.aborted) setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => {
      if (!document.hidden && !active.current) void refresh();
    }, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      active.current?.abort();
    };
  }, [refresh]);

  async function login(password: string) {
    await requestLocal({ action: "login", password });
    await refresh();
  }

  async function logout() {
    await requestLocal({ action: "logout" });
    await refresh();
  }

  async function switchProfile(profile: string) {
    if ((view.mode !== "online" && view.mode !== "offline") || !view.local)
      throw new LocalRequestError(409, "本机配置已变化，请刷新后重试");
    const local = view.local;
    const option = local.profiles.find((item) => item.id === profile);
    if (!option) throw new LocalRequestError(409, "该连接已移除，请刷新后重试");
    if (view.mode === "offline") {
      await requestLocal({
        action: "switch",
        profile,
        revision: local.revision,
      });
    } else {
      await runOnline(view.identity, {
        intent: "switch",
        node_id: view.identity.nodeId,
        profile,
        revision: local.revision,
        challenge: option.challenge,
      });
    }
  }

  return { view, refreshing, refresh, login, logout, switchProfile };
}
