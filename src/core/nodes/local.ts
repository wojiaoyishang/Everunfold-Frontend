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
