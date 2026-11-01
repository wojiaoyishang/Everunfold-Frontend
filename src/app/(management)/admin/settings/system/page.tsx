import { readConfiguration } from "@/core/config/server";
import { SystemSettingsPage } from "@/themes/argon/admin/settings/system";
export default function Page() {
  const config = readConfiguration();
  return (
    <SystemSettingsPage
      runtime={{
        nodeId: config.frontendNodeId,
        publicSiteUrl: config.publicSiteUrl ?? null,
        backendBaseUrl: config.backendBaseUrl,
        settingsDirectory: "config.toml → settings.directory",
        snapshotDirectory: "config.toml → cache.directory",
        receiverConfigured: Boolean(config.settings.sourceEpoch),
      }}
    />
  );
}
