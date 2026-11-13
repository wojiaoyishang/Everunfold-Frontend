import { NextRequest, NextResponse } from "next/server";
import { readConfiguration } from "@/core/config/server";
import { nodesConsolePath } from "@/core/auth/routes";
import type { NodeProof, NodeProofRequest } from "@/core/contracts/settings";
import type { LocalGate } from "@/core/nodes/local";
import {
  acceptsProof,
  backendMode,
  cookieName,
  issueOfflineSession,
  offlineConfigured,
  offlineSession,
  proofChallenge,
  sessionSeconds,
  verifyOfflinePassword,
} from "@/server/nodes/access";
import {
  activateProfile,
  inspectNode,
  localRevision,
  NodeConfigConflict,
} from "@/server/nodes/local";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};
type Config = ReturnType<typeof readConfiguration>;

const reply = (value: object, status = 200) =>
  NextResponse.json(value, { status, headers });
const notFound = () => reply({ error: "节点诊断未启用" }, 404);

function allowedHost(request: NextRequest, config: Config) {
  const origin = config.nodesMonitor.origin;
  return (
    config.nodesMonitor.enabled &&
    origin &&
    request.headers.get("host")?.toLowerCase() === new URL(origin).host &&
    request.nextUrl.protocol === new URL(origin).protocol
  );
}

function setSession(response: NextResponse, config: Config, value: string) {
  response.cookies.set(cookieName, value, {
    path: nodesConsolePath,
    httpOnly: true,
    secure: config.nodesMonitor.origin?.startsWith("https://"),
    sameSite: "strict",
    maxAge: value ? sessionSeconds : 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const config = readConfiguration();
  if (!allowedHost(request, config)) return notFound();
  const mode = await backendMode(config);
  const offline = mode === "offline";
  const gate: LocalGate = {
    mode,
    passwordConfigured: offline && offlineConfigured(config),
    unlocked:
      offline && offlineSession(config, request.cookies.get(cookieName)?.value),
  };
  if (mode === "online") {
    gate.backendBaseUrl = config.backendBaseUrl;
    gate.nodeId = config.frontendNodeId;
    gate.profile = config.connections?.active ?? "inline";
    gate.revision = localRevision(config);
    gate.challenge = proofChallenge(config, {
      profile: gate.profile,
      revision: gate.revision,
    });
  }
  const response = reply(gate);
  return !offline && request.cookies.has(cookieName)
    ? setSession(response, config, "")
    : response;
}

async function readInput(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  if (!request.body) throw new Error("body required");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf8", { fatal: true });
  let input = "";
  let length = 0;
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel().catch(() => {});
  }, 4000);
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      if (length > 4096) throw new Error("body too large");
      input += decoder.decode(chunk.value, { stream: true });
    }
    if (expired) throw new Error("request timed out");
    const parsed: unknown = JSON.parse(input + decoder.decode());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("invalid body");
    return parsed as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
    await reader.cancel();
  }
}

class LocalAccessError extends Error {}

export async function POST(request: NextRequest) {
  const config = readConfiguration();
  if (!allowedHost(request, config)) return notFound();
  if (request.headers.get("origin") !== config.nodesMonitor.origin)
    return reply({ error: "请求来源无效" }, 403);
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    return reply({ error: "请提交 JSON" }, 415);
  const input = await readInput(request).catch(() => null);
  if (!input) return reply({ error: "请求无效" }, 400);
  if (input.action === "logout")
    return setSession(reply({ ok: true }), config, "");
  const mode = await backendMode(config);
  if (input.action === "login") {
    if (mode !== "offline" || !offlineConfigured(config))
      return reply({ error: "本机密码入口不可用" }, 403);
    if (
      typeof input.password !== "string" ||
      !input.password ||
      input.password.length > 1024
    )
      return reply({ error: "请输入节点诊断密码" }, 422);
    const result = await verifyOfflinePassword(config, input.password);
    if (result === "limited")
      return reply({ error: "尝试次数过多，请稍后再试" }, 429);
    if (result !== "accepted") return reply({ error: "密码不正确" }, 401);
    return setSession(reply({ ok: true }), config, issueOfflineSession(config));
  }

  const action = input.action;
  if (action !== "inspect" && action !== "switch")
    return reply({ error: "操作无效" }, 422);
  const revision = localRevision(config);
  const profile =
    action === "inspect"
      ? (config.connections?.active ?? "inline")
      : input.profile;
  if (
    typeof profile !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(profile) ||
    (action === "switch" && input.revision !== revision)
  )
    return reply({ error: "本机配置已变化，请刷新后重试" }, 409);
  const proofRequest: NodeProofRequest = {
    node_id: config.frontendNodeId,
    intent: action,
    profile,
    revision,
    challenge: typeof input.challenge === "string" ? input.challenge : "",
  };
  const proof = input.proof as NodeProof | undefined;
  const rawCookie = request.cookies.get(cookieName)?.value;
  function authorize(current: Config, currentMode: typeof mode) {
    if (
      allowedHost(request, current) &&
      ((currentMode === "offline" && offlineSession(current, rawCookie)) ||
        (currentMode === "online" &&
          proof &&
          typeof proof.signature === "string" &&
          acceptsProof(current, proofRequest, proof)))
    )
      return;
    throw new LocalAccessError();
  }
  try {
    authorize(config, mode);
    if (action === "inspect") return reply(await inspectNode(config));
    await activateProfile(config, profile, async (current) =>
      authorize(current, await backendMode(current)),
    );
    return setSession(reply({ ok: true }), config, "");
  } catch (error) {
    if (error instanceof LocalAccessError)
      return reply({ error: "请先通过当前连接的身份验证" }, 403);
    if (error instanceof NodeConfigConflict)
      return reply({ error: "本机配置已变化，请刷新后重试" }, 409);
    return reply({ error: "无法读取或保存本机配置" }, 503);
  }
}
