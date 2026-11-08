import type { PluginUsage, PublicSettings } from "@/core/contracts/settings";

/** Compare saved activation with the whole draft, including edits made on another settings tab. */
export function changedPluginIds(saved: PublicSettings, draft: PublicSettings) {
  const before = new Set(saved.extensions?.disabled_plugins ?? []);
  const after = new Set(draft.extensions?.disabled_plugins ?? []);
  return [...new Set([...before, ...after])]
    .filter((id) => before.has(id) !== after.has(id))
    .sort();
}

export function pluginNeedsConfirmation(usage: PluginUsage) {
  return (
    !usage.registered ||
    (usage.applied_pages ?? 0) > 0 ||
    (usage.published_contents ?? 0) > 0 ||
    (usage.scheduled_contents ?? 0) > 0
  );
}
