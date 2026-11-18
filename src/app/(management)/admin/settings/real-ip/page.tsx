import { readPageConfiguration } from "@/core/config/server";
import { RequestIPPage } from "@/themes/argon/admin/settings/real-ip";

export default function Page() {
  return <RequestIPPage nodeId={readPageConfiguration().frontendNodeId} />;
}
