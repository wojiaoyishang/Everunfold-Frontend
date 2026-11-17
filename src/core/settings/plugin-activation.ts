import type { PublicSettings } from "@/core/contracts/settings";

type PluginPreferences = PublicSettings["extensions"];

export function pluginEnabled(preferences: PluginPreferences, id: string) {
  return preferences?.enabled_plugins
    ? preferences.enabled_plugins.includes(id)
    : !preferences?.disabled_plugins?.includes(id);
}

export function pluginChoices(preferences: PluginPreferences) {
  return preferences?.enabled_plugins ?? preferences?.disabled_plugins ?? [];
}

export function withPluginChoices(
  preferences: PluginPreferences,
  ids: readonly string[],
  enabled: boolean,
): NonNullable<PluginPreferences> {
  const explicit = preferences?.enabled_plugins != null;
  const selected = new Set(pluginChoices(preferences));
  for (const id of ids) {
    if (enabled === explicit) selected.add(id);
    else selected.delete(id);
  }
  return {
    ...preferences,
    [explicit ? "enabled_plugins" : "disabled_plugins"]: [...selected].sort(),
  };
}
