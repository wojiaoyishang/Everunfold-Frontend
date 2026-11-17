import type { PluginUsage, PublicSettings } from "@/core/contracts/settings";
import {
  pluginChoices,
  pluginEnabled,
  withPluginChoices,
} from "./plugin-activation";

/** Compare saved activation with the whole draft, including edits made on another settings tab. */
export function changedPluginIds(saved: PublicSettings, draft: PublicSettings) {
  return [
    ...new Set([
      ...pluginChoices(saved.extensions),
      ...pluginChoices(draft.extensions),
    ]),
  ]
    .filter(
      (id) =>
        pluginEnabled(saved.extensions, id) !==
        pluginEnabled(draft.extensions, id),
    )
    .sort();
}

/** Undo this pending activation batch while retaining all other draft edits. */
export function restorePluginChoices(
  current: PublicSettings,
  previous: PublicSettings,
  ids: readonly string[],
): PublicSettings {
  let extensions = { ...current.extensions };
  for (const id of ids) {
    extensions = withPluginChoices(
      extensions,
      [id],
      pluginEnabled(previous.extensions, id),
    );
  }
  if (
    !extensions.disabled_plugins?.length &&
    previous.extensions?.disabled_plugins === undefined
  )
    delete extensions.disabled_plugins;
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
    (usage.active_tasks ?? 0) > 0 ||
    (usage.captcha_references ?? 0) > 0 ||
    (usage.applied_pages ?? 0) > 0 ||
    (usage.published_contents ?? 0) > 0 ||
    (usage.scheduled_contents ?? 0) > 0
  );
}
