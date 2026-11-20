import { AsyncLocalStorage } from "node:async_hooks";
import type { IncomingMessage } from "node:http";
import { BlockList, isIP } from "node:net";
import type { FrontendConfiguration } from "../../core/config/schema";
import { syncFailure } from "../sync-diagnostics";

type Peer = { address: string; forwardedHttps: boolean };
const slot = Symbol.for("everunfold.nodes.request-peer");
// The custom Node listener and Next's server bundle run in the same process.
const processScope = globalThis as typeof globalThis & {
  [slot]?: AsyncLocalStorage<Peer>;
};
const peers = (processScope[slot] ??= new AsyncLocalStorage<Peer>());

export function withNodeRequestPeer<T>(
  request: IncomingMessage,
  handle: () => T,
): T {
  return peers.run(
    {
      address: request.socket.remoteAddress?.replace(/^::ffff:/, "") ?? "",
      forwardedHttps: request.headers["x-forwarded-proto"] === "https",
    },
    handle,
  );
}

export function acceptsNodeConsolePeer(
  monitor: FrontendConfiguration["nodesMonitor"],
): boolean {
  const peer = peers.getStore();
  const address = peer?.address ?? "";
  const version = isIP(address);
  const family = version === 6 ? "ipv6" : "ipv4";
  if (monitor.allowedPeerIps.length) {
    const allowed = new BlockList();
    for (const rule of monitor.allowedPeerIps) {
      const [host, prefix] = rule.split("/");
      const kind = isIP(host) === 6 ? "ipv6" : "ipv4";
      if (prefix === undefined) allowed.addAddress(host, kind);
      else allowed.addSubnet(host, Number(prefix), kind);
    }
    if (!version || !allowed.check(address, family)) {
      syncFailure(
        {
          direction: "local",
          operation: "node console source",
          peer: address,
          status: 404,
        },
        "monitor_peer_not_allowed",
      );
      return false;
    }
  }
  if (
    !monitor.origin?.startsWith("https:") ||
    !monitor.trustedTlsProxyIps.length
  )
    return true;
  const trusted = new BlockList();
  for (const ip of monitor.trustedTlsProxyIps)
    trusted.addAddress(ip, isIP(ip) === 6 ? "ipv6" : "ipv4");
  const allowed = version !== 0 && trusted.check(address, family);
  if (allowed && peer?.forwardedHttps) return true;
  syncFailure(
    {
      direction: "local",
      operation: "node console HTTPS",
      peer: address,
      status: 404,
    },
    allowed ? "monitor_https_required" : "monitor_proxy_untrusted",
  );
  return false;
}
