import type { PluginUsage, PublicSettings } from "@/core/contracts/settings";

/** Compare saved activation with the whole draft, including edits made on another settings tab. */
export function changedPluginIds(saved: PublicSettings, draft: PublicSettings) {
  const before = new Set(saved.extensions?.disabled_plugins ?? []);
  const after = new Set(draft.extensions?.disabled_plugins ?? []);
  return [...new Set([...before, ...after])]
    .filter((id) => before.has(id) !== after.has(id))
    .sort();
}

/** Undo this pending activation batch while retaining all other draft edits. */
export function restorePluginChoices(
  current: PublicSettings,
  previous: PublicSettings,
  ids: readonly string[],
): PublicSettings {
  const before = new Set(previous.extensions?.disabled_plugins ?? []);
  const disabled = new Set(current.extensions?.disabled_plugins ?? []);
  for (const id of ids) {
    if (before.has(id)) disabled.add(id);
    else disabled.delete(id);
  }
  const extensions = { ...current.extensions };
  if (disabled.size || previous.extensions?.disabled_plugins !== undefined)
    extensions.disabled_plugins = [...disabled].sort();
  else delete extensions.disabled_plugins;
  return {
    ...current,
    extensions: Object.keys(extensions).length
      ? extensions
      : previous.extensions,
  };
}

export function pluginNeedsConfirmation(usage: PluginUsage) {
  return (
    !usage.registered ||
    (usage.applied_pages ?? 0) > 0 ||
    (usage.published_contents ?? 0) > 0 ||
    (usage.scheduled_contents ?? 0) > 0
  );
}
