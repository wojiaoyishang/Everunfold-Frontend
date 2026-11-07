"use client";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { ExtensionPlaceholder } from "@/themes/argon/components/extension-placeholder";
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
  const runtime = usePluginRuntime();
  const definitions =
    runtime.catalog?.plugins
      .filter((p) => !runtime.catalog?.disabled.includes(p.id))
      .flatMap((p) => p.pages) ?? pluginRegistry.pages;
  const entry = definitions.find(
    ({ registration }) =>
      registration.id === page.implementation_id &&
      registration.version === page.implementation_version,
  );
  if (!entry)
    return (
      <ExtensionPlaceholder
        name={page.implementation_id ?? "page"}
        loading={runtime.loading}
      />
    );
  return (
    <ExtensionComponent name={entry.component} page={page} onReady={onReady} />
  );
}
