import {
  readBrowserBackendBaseUrl,
  readPageConfiguration,
} from "@/core/config/server";
import { NodeStatusPage } from "@/themes/argon/admin/settings/node-status";

export default async function Page() {
  const config = readPageConfiguration();
  return (
    <NodeStatusPage
      runtime={{
        nodeId: config.frontendNodeId,
        publicSiteUrl: config.publicSiteUrl ?? null,
        backendBaseUrl: await readBrowserBackendBaseUrl(),
        receiverConfigured: Boolean(config.settings.sourceEpoch),
      }}
    />
  );
}
