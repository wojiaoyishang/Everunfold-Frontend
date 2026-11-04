import { uuidv4 } from "lib0/random";

/** LAN HTTP still provides getRandomValues; randomUUID and subtle require HTTPS. */
export function randomUUID(): string {
  return globalThis.crypto?.randomUUID?.() ?? uuidv4();
}

/** The existing lib0 SHA-256 preserves the source fingerprint on HTTP origins. */
export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = globalThis.crypto?.subtle
    ? new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
    : (await import("lib0/hash/sha256")).digest(bytes);
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
