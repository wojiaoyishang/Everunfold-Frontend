import type { ReceiverStatus } from "@/core/contracts/settings";

export interface LocalGate {
  mode: "online" | "offline" | "unavailable";
  passwordConfigured: boolean;
  unlocked: boolean;
  backendBaseUrl?: string;
  nodeId?: string;
  profile?: string;
  revision?: string;
  challenge?: string;
}

export interface LocalNode {
  nodeId: string;
  active: string;
  revision: string;
  profiles: { id: string; challenge: string }[];
  receiver: "reachable" | "unavailable" | "rejected" | "not_configured";
  replicas?: Pick<
    ReceiverStatus,
    "public_settings" | "cache_policy" | "public_content"
  >;
}

export interface ConnectionDraft {
  id: string;
  nodeId: string;
  publicUrl: string;
  internalUrl: string;
  sourceEpoch: string;
  allowedPeerIps: string[];
  inboundToken: string;
  outboundToken: string;
}

export interface ConnectionList {
  filename: string;
  revision: string;
  active: string;
  editable: boolean;
  profiles: (Omit<ConnectionDraft, "inboundToken" | "outboundToken"> & {
    hasInboundToken: boolean;
    hasOutboundToken: boolean;
  })[];
}
