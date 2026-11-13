import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { readConfiguration } from "@/core/config/server";
import { connectionIdentity } from "@/core/config/files";
import type { NodeProof, NodeProofRequest } from "@/core/contracts/settings";

type Config = ReturnType<typeof readConfiguration>;
export type BackendMode = "online" | "offline" | "unavailable";

const offlineErrors = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
]);

export async function backendMode(config: Config): Promise<BackendMode> {
  try {
    const response = await fetch(config.backend.baseUrl + "/health/live", {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(
        Math.min(config.backend.connectTimeoutSeconds, 3) * 1000,
      ),
    });
    // Even a failed HTTP response is not a reason to fall back to a local password.
    if (!response.ok) {
      await response.body?.cancel();
      return "unavailable";
    }
    const reader = response.body?.getReader();
    if (!reader) return "unavailable";
    try {
      let body = "";
      const decoder = new TextDecoder();
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        body += decoder.decode(chunk.value, { stream: true });
        if (body.length > 4096) return "unavailable";
      }
      const value = JSON.parse(body);
      return value?.success === true &&
        value?.data?.status === "alive" &&
        value?.data?.stage === "browser-auth"
        ? "online"
        : "unavailable";
    } finally {
      await reader.cancel();
    }
  } catch (error) {
    const cause = (error as Error).cause as
      { code?: string; errors?: { code?: string }[] } | undefined;
    const codes = cause?.errors?.map((item) => item.code) ?? [cause?.code];
    return codes.length > 0 &&
      codes.every((code) => code && offlineErrors.has(code))
      ? "offline"
      : "unavailable";
  }
}

export const cookieName = "everunfold_frontend_nodes";
export const sessionSeconds = 15 * 60;

function offlineKey(config: Config): string | undefined {
  const monitor = config.nodesMonitor;
  const secret = process.env[monitor.sessionSecretEnv] ?? "";
  if (!monitor.passwordHash || !/^[A-Za-z0-9_-]{43,128}$/.test(secret)) return;
  return sign(
    secret,
    JSON.stringify([
      monitor.passwordHash,
      monitor.origin,
      connectionIdentity(config),
      config.connections?.revision,
    ]),
  );
}

export function offlineConfigured(config: Config): boolean {
  return offlineKey(config) !== undefined;
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function equalSignature(actual: string, expected: string): boolean {
  return (
    /^[0-9a-f]{64}$/.test(actual) &&
    timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))
  );
}

export function offlineSession(config: Config, raw?: string): boolean {
  const key = offlineKey(config);
  if (!key || !raw || raw.length > 128) return false;
  const [expiry, nonce, signature, extra] = raw.split(".");
  const remaining = Number(expiry) - Math.floor(Date.now() / 1000);
  return (
    extra === undefined &&
    /^\d{10}$/.test(expiry) &&
    /^[0-9a-f]{32}$/.test(nonce) &&
    remaining > 0 &&
    remaining <= sessionSeconds &&
    equalSignature(signature ?? "", sign(key, expiry + "." + nonce))
  );
}

export function issueOfflineSession(config: Config): string {
  const key = offlineKey(config);
  if (!key) throw new Error("Offline credentials are unavailable");
  const payload =
    Math.floor(Date.now() / 1000) +
    sessionSeconds +
    "." +
    randomBytes(16).toString("hex");
  return payload + "." + sign(key, payload);
}

const attempts: number[] = [];
let verifying = 0;

export async function verifyOfflinePassword(config: Config, password: string) {
  const now = Date.now();
  while (attempts.length && attempts[0] <= now - 300_000) attempts.shift();
  if (attempts.length >= 12 || verifying >= 2) return "limited";
  const hash = config.nodesMonitor.passwordHash;
  if (!hash || !offlineConfigured(config)) return "denied";
  attempts.push(now);
  verifying += 1;
  try {
    const [, salt, digest] = hash.split("$");
    const key = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, Buffer.from(salt, "hex"), 32, (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
    return timingSafeEqual(key, Buffer.from(digest, "hex"))
      ? "accepted"
      : "denied";
  } finally {
    verifying -= 1;
  }
}

export function proofChallenge(
  config: Config,
  request: Pick<NodeProofRequest, "profile" | "revision">,
) {
  const secret =
    process.env[config.backend.fastapiToNextjsTokenEnv ?? ""] ?? "";
  // Bind proofs to this deployed console as well as the backend-issued node and epoch.
  return sign(
    secret,
    JSON.stringify([
      "local-node-challenge-v1",
      config.nodesMonitor.origin,
      request.revision,
      request.profile,
    ]),
  ).slice(0, 32);
}

export function acceptsProof(
  config: Config,
  request: NodeProofRequest,
  proof: NodeProof,
): boolean {
  const secret =
    process.env[config.backend.fastapiToNextjsTokenEnv ?? ""] ?? "";
  const remaining = proof.expires - Math.floor(Date.now() / 1000);
  if (
    secret.length < 32 ||
    !config.settings.sourceEpoch ||
    !Number.isSafeInteger(proof.expires) ||
    remaining <= 0 ||
    remaining > 30 ||
    request.challenge !== proofChallenge(config, request)
  )
    return false;
  const payload = [
    "everunfold-node-console-v1",
    config.frontendNodeId,
    config.settings.sourceEpoch,
    request.intent,
    request.profile,
    request.revision,
    request.challenge,
    proof.expires,
  ].join("\n");
  return equalSignature(proof.signature, sign(secret, payload));
}
