import { readPageConfiguration } from "@/core/config/server";
import { CacheSettingsPage } from "@/themes/argon/admin/settings/cache";

export default function Page() {
  return (
    <CacheSettingsPage localNode={readPageConfiguration().frontendNodeId} />
  );
}
