import { readPageConfiguration } from "@/core/config/server";
import { NodeStatusPage } from "@/themes/argon/admin/settings/node-status";

export default function Page() {
  return <NodeStatusPage localNode={readPageConfiguration().frontendNodeId} />;
}
