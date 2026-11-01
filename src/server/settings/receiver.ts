/** Dedicated Node listener exposes the real socket peer; never trusts proxy headers. */
import { createServer } from "node:http";
import { BlockList, isIP } from "node:net";
import { createHash, timingSafeEqual } from "node:crypto";
import type { SettingsStore } from "./store";
import type { ContentStore } from "../content/store";

export function settingsReceiver(
  store: SettingsStore,
  token: string,
  peers: string[],
  content?: ContentStore,
) {
  if (token.length < 32 || !peers.length)
    throw new Error("Settings receiver credentials are not configured");
  const allowed = new BlockList();
  for (const entry of peers) {
    const [address, prefix] = entry.split("/");
    const family = isIP(address) === 6 ? "ipv6" : "ipv4";
    if (prefix === undefined) allowed.addAddress(address, family);
    else allowed.addSubnet(address, Number(prefix), family);
  }
  const secret = createHash("sha256").update(`Bearer ${token}`).digest();
  return createServer(
    { maxHeaderSize: 8192, requestTimeout: 10000, headersTimeout: 5000 },
    async (request, response) => {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Type", "application/json");
      const reply = (status: number, body: object) => {
        response.writeHead(status);
        response.end(JSON.stringify(body));
      };
      const peer = request.socket.remoteAddress?.replace(/^::ffff:/, "") ?? "";
      const presented = createHash("sha256")
        .update(request.headers.authorization ?? "")
        .digest();
      if (
        !isIP(peer) ||
        !allowed.check(peer, isIP(peer) === 6 ? "ipv6" : "ipv4") ||
        !timingSafeEqual(secret, presented)
      ) {
        reply(403, { error: "forbidden" });
        request.resume();
        return;
      }
      const selected =
        request.url === "/internal/settings/apply"
          ? store
          : request.url === "/internal/cache/v1/apply"
            ? content
            : undefined;
      if (request.method !== "POST" || !selected) {
        reply(404, { error: "unknown_operation" });
        request.resume();
        return;
      }
      if (
        request.headers["content-type"]?.split(";", 1)[0] !== "application/json"
      ) {
        reply(415, { error: "json_required" });
        request.resume();
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        for await (const chunk of request) {
          size += chunk.length;
          if (size > (selected === content ? content.maxBytes : 65536)) {
            reply(413, { error: "too_large" });
            request.resume();
            return;
          }
          chunks.push(Buffer.from(chunk));
        }
        const bytes = Buffer.concat(chunks);
        const applied = await selected.apply(
          JSON.parse(bytes.toString("utf8")),
        );
        reply(200, {
          node_id: applied.node_id,
          source_epoch: applied.source_epoch,
          resource: applied.resource,
          revision: applied.revision,
          digest: createHash("sha256").update(bytes).digest("hex"),
          durable: true,
        });
      } catch {
        if (!response.headersSent)
          reply(409, { error: "resource_not_applied" });
      }
    },
  );
}
