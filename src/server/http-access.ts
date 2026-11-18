import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { BlockList, isIP } from "node:net";
import type { SettingsContract } from "@/core/contracts/settings";
import { runtimeLog } from "./runtime-log";

type Policy = Required<SettingsContract["request_ip_policy"]["data"]>;
type Observation = SettingsContract["request_ip_diagnostic"]["data"]["fastapi"];

const ipHeaders = {
  "x-real-ip": "x_real_ip",
  "x-forwarded-for": "x_forwarded_for",
  forwarded: "forwarded",
  "cf-connecting-ip": "cf_connecting_ip",
  "true-client-ip": "true_client_ip",
} as const;

type IPHeader = keyof typeof ipHeaders;

const chains = new Set<IPHeader>(["x-forwarded-for", "forwarded"]);
const refreshMs = 15000;
const expiresMs = 60000;
const probePath = "/admin/settings/real-ip/diagnostics";
const directPolicy = { source: "peer", fallback: "peer", revision: 0 } as const;
const untrusted = { ipv4: new BlockList(), ipv6: new BlockList() };

function normalizedIP(raw: string): string | null {
  const value = raw.trim().replace(/^"([^"]*)"$/, "$1");
  const withPort =
    /^\[([0-9a-f:.]+)\](?::[0-9]{1,5})?$|^([0-9.]+):[0-9]{1,5}$/i.exec(value);
  const address = withPort?.[1] ?? withPort?.[2] ?? value;
  if (address.length > 45 || address.includes("%") || !isIP(address))
    return null;
  if (isIP(address) === 4) return address;
  const normalized = new URL(`http://[${address}]`).hostname.slice(1, -1);
  const mapped = /^::ffff:([0-9a-f]+):([0-9a-f]+)$/.exec(normalized);
  if (!mapped) return normalized;
  const high = Number.parseInt(mapped[1], 16);
  const low = Number.parseInt(mapped[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

function splitForwarded(value: string, delimiter: string): string[] {
  const result: string[] = [];
  let quoted = false;
  let escaped = false;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (escaped) escaped = false;
    else if (char === '"') quoted = !quoted;
    else if (quoted && char === "\\") escaped = true;
    else if (char === delimiter && !quoted) {
      result.push(value.slice(start, index));
      start = index + 1;
    }
  }
  return quoted ? [] : [...result, value.slice(start)];
}

function forwardedIP(entry: string): string | null {
  const values = splitForwarded(entry, ";")
    .map((parameter) => /^\s*for\s*=(.*)$/i.exec(parameter)?.[1])
    .filter((value) => value !== undefined);
  return values.length === 1 ? normalizedIP(values[0]) : null;
}

function headerIPs(lines: string[] | undefined, name: IPHeader) {
  if (!lines?.length) return [];
  if (lines.reduce((size, line) => size + line.length, 0) > 2048) return [null];
  if (!chains.has(name))
    return [lines.length === 1 ? normalizedIP(lines[0]) : null];
  const joined = lines.join(",");
  const entries =
    name === "forwarded" ? splitForwarded(joined, ",") : joined.split(",");
  if (!entries.length || entries.length > 16) return [null];
  return entries.map(name === "forwarded" ? forwardedIP : normalizedIP);
}

function matches(trusted: typeof untrusted, address: string) {
  const family = isIP(address) === 6 ? "ipv6" : "ipv4";
  return trusted[family].check(address, family);
}

function readPolicy(
  input: unknown,
): { policy: Policy; trusted: typeof untrusted } | undefined {
  if (!input || typeof input !== "object") return;
  const candidate = input as Policy;
  const isHeader = (value: unknown) =>
    typeof value === "string" && Object.hasOwn(ipHeaders, value);
  if (
    (candidate.source !== "peer" && !isHeader(candidate.source)) ||
    (candidate.fallback !== "peer" &&
      candidate.fallback !== "none" &&
      !isHeader(candidate.fallback)) ||
    !Number.isSafeInteger(candidate.revision) ||
    candidate.revision < 0 ||
    !Array.isArray(candidate.trusted_proxies) ||
    candidate.trusted_proxies.length > 64
  )
    return;

  const trusted = { ipv4: new BlockList(), ipv6: new BlockList() };
  for (const cidr of candidate.trusted_proxies) {
    if (typeof cidr !== "string") return;
    const match = /^([0-9a-f:.]+)\/([0-9]{1,3})$/i.exec(cidr);
    if (!match) return;
    const [, address, bits] = match;
    const version = isIP(address);
    if (!version || Number(bits) > (version === 4 ? 32 : 128)) return;
    const family = version === 6 ? "ipv6" : "ipv4";
    trusted[family].addSubnet(address, Number(bits), family);
  }
  return { policy: candidate, trusted };
}

export function requestIPObservation(
  request: Pick<IncomingMessage, "headersDistinct">,
  address: string | undefined,
  active?: ReturnType<typeof readPolicy>,
): Observation {
  const policy = active?.policy ?? directPolicy;
  const trusted = active?.trusted ?? untrusted;
  const peer = normalizedIP(address ?? "");
  const trustedProxy = peer !== null && matches(trusted, peer);
  const headers = Object.fromEntries(
    (Object.keys(ipHeaders) as IPHeader[]).map((name) => [
      ipHeaders[name],
      headerIPs(request.headersDistinct[name], name),
    ]),
  ) as Record<(typeof ipHeaders)[IPHeader], (string | null)[]>;

  function resolve(source: Policy["fallback"]) {
    if (source === "peer") return peer;
    if (source === "none" || !trustedProxy) return null;
    const chain = headers[ipHeaders[source]];
    if (!chains.has(source)) return chain[0] ?? null;
    for (let index = chain.length - 1; index >= 0; index--) {
      const hop = chain[index];
      if (!hop || !matches(trusted, hop)) return hop;
    }
    return null;
  }

  let client = resolve(policy.source);
  const source = client ? policy.source : policy.fallback;
  client ??= resolve(source);
  const proto = request.headersDistinct["x-forwarded-proto"];
  return {
    peer_ip: peer,
    client_ip: client,
    client_ip_source: client && source !== "none" ? source : null,
    trusted_proxy: trustedProxy,
    ip_policy_revision: active?.policy.revision ?? null,
    ...headers,
    x_forwarded_proto:
      proto?.length === 1 && ["http", "https"].includes(proto[0])
        ? proto[0]
        : null,
  };
}

function validTicket(header: string, nodeId: string, secret: string): boolean {
  const match = /^Bearer ([0-9]{1,12})\.([a-f0-9]{64})$/.exec(header);
  if (!match || secret.length < 32) return false;
  const [, expires, signature] = match;
  const remaining = Number(expires) - Math.floor(Date.now() / 1000);
  if (remaining <= 0 || remaining > 65) return false;
  const expected = createHmac("sha256", secret)
    .update(`everunfold/ip-probe/v1:${nodeId}:${expires}`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function frontendHTTPAccess({
  baseUrl,
  nodeId,
  outboundToken,
  inboundToken,
}: {
  baseUrl: string;
  nodeId: string;
  outboundToken: string;
  inboundToken: string;
}) {
  let active: ReturnType<typeof readPolicy>;
  let expires = 0;

  async function refresh() {
    if (!baseUrl || outboundToken.length < 32) return;
    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/internal/frontend-nodes/${encodeURIComponent(nodeId)}/real-ip`,
        {
          headers: { Authorization: `Bearer ${outboundToken}` },
          redirect: "error",
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        if ([401, 403, 404].includes(response.status)) active = undefined;
        return;
      }
      const data = await response.json();
      const next = data?.success === true && readPolicy(data.data);
      if (next) {
        active = next;
        expires = performance.now() + expiresMs;
      }
    } catch {
      // If the backend stays unreachable, the previous policy expires locally.
    }
  }

  let timer: ReturnType<typeof setInterval> | undefined;
  return {
    start() {
      void refresh();
      timer = setInterval(() => void refresh(), refreshMs);
      timer.unref();
    },
    stop() {
      clearInterval(timer);
    },
    observe(
      request: IncomingMessage,
      response: ServerResponse,
      pathname: string,
    ) {
      const observation = requestIPObservation(
        request,
        request.socket.remoteAddress,
        performance.now() < expires ? active : undefined,
      );
      response.once("finish", () => {
        runtimeLog(
          "info",
          "http_access",
          `${request.method} → ${response.statusCode}`,
          {
            method: request.method,
            status: response.statusCode,
            ...observation,
          },
        );
      });
      if (pathname !== probePath) return false;
      const approved =
        request.method === "POST" &&
        validTicket(request.headers.authorization ?? "", nodeId, inboundToken);
      request.resume();
      response.writeHead(approved ? 200 : 404, {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      });
      response.end(
        JSON.stringify(approved ? observation : { error: "not_found" }),
      );
      return true;
    },
  };
}
