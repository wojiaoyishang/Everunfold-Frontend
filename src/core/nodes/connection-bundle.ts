import type { ConnectionDraft } from "./local";

export const maxConnectionEncodingLength = 89432;
const invalid = "连接编码无效，请粘贴后端导出的完整 Base64。";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(invalid);
  return value as Record<string, unknown>;
}

function credential(value: unknown) {
  const item = object(value);
  if (
    typeof item.name !== "string" ||
    !/^[A-Z_][A-Z0-9_]{0,127}$/.test(item.name) ||
    typeof item.value !== "string" ||
    !/^[!-~]{32,4096}$/.test(item.value)
  )
    throw new Error(invalid);
  return { name: item.name, value: item.value };
}

/** Decode only in the local editor; never fetch an address or save implicitly. */
export function decodeConnectionBundle(
  encoded: string,
): Pick<
  ConnectionDraft,
  "nodeId" | "publicUrl" | "sourceEpoch" | "inboundToken" | "outboundToken"
> {
  try {
    if (encoded.length > maxConnectionEncodingLength) throw new Error(invalid);
    const compact = encoded.replace(/[ \t\r\n]/g, "");
    if (!compact || compact.length > 87384) throw new Error(invalid);
    const binary = atob(compact);
    if (binary.length > 65536 || btoa(binary) !== compact)
      throw new Error(invalid);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(binary, (value) => value.charCodeAt(0)),
    );
    const bundle = object(JSON.parse(text));
    const nodeId = bundle.node_id;
    const sourceEpoch = bundle.source_epoch;
    const publicUrl = bundle.backend_public_url;
    if (
      bundle.format !== "everunfold-node-connection/v1" ||
      typeof nodeId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(nodeId) ||
      typeof sourceEpoch !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sourceEpoch,
      ) ||
      /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(sourceEpoch) ||
      typeof publicUrl !== "string" ||
      publicUrl.length > 2048 ||
      /\s|[\\?#*]/.test(publicUrl)
    )
      throw new Error(invalid);
    const url = new URL(publicUrl);
    const local =
      url.hostname === "localhost" ||
      url.hostname === "[::1]" ||
      /^127\.\d+\.\d+\.\d+$/.test(url.hostname);
    if (
      !/^https?:\/\//.test(publicUrl) ||
      (url.protocol !== "https:" && !local) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.port === "0" ||
      ["0.0.0.0", "[::]"].includes(url.hostname)
    )
      throw new Error(invalid);
    const tokens = object(bundle.tokens);
    const inbound = credential(tokens.inbound);
    const outbound = credential(tokens.outbound);
    if (inbound.name === outbound.name || inbound.value === outbound.value)
      throw new Error(invalid);
    return {
      nodeId,
      publicUrl: publicUrl.replace(/\/$/, ""),
      sourceEpoch,
      inboundToken: inbound.value,
      outboundToken: outbound.value,
    };
  } catch {
    // Neither parser errors nor the pasted credentials are sent to the console.
    throw new Error(invalid);
  }
}
