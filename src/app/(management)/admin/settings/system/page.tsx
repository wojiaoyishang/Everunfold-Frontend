import {
  readBrowserBackendBaseUrl,
  readPageConfiguration,
} from "@/core/config/server";
import { SystemSettingsPage } from "@/themes/argon/admin/settings/system";
export default async function Page() {
  const config = readPageConfiguration();
  return (
    <SystemSettingsPage
      runtime={{
        nodeId: config.frontendNodeId,
        publicSiteUrl: config.publicSiteUrl ?? null,
        backendBaseUrl: await readBrowserBackendBaseUrl(),
        settingsDirectory: "config.toml → settings.directory",
        snapshotDirectory: "config.toml → cache.directory",
        receiverConfigured: Boolean(config.settings.sourceEpoch),
      }}
    />
  );
}
