import type { PublicManagedPage } from "@/core/contracts/pages";
import { pluginRegistry } from "@/core/plugins/registry";
import { ExtensionComponent } from "@/core/extensions/components";

export interface CustomPageProps {
  page: PublicManagedPage;
}

export function RegisteredPageView({
  page,
  onReady,
}: CustomPageProps & { onReady?: () => void }) {
  const entry = pluginRegistry.pages.find(
    ({ registration }) =>
      registration.id === page.implementation_id &&
      registration.version === page.implementation_version,
  );
  if (!entry) throw new Error("Unavailable registered page implementation");
  return (
    <ExtensionComponent name={entry.component} page={page} onReady={onReady} />
  );
}
