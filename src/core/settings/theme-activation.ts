import type {
  PublicSettings,
  SaveSettings,
  SettingsState,
} from "@/core/contracts/settings";

/** Activation changes only the saved theme; unrelated settings remain an unsaved draft. */
export function themeActivationInput(
  saved: SettingsState,
  theme: string,
): SaveSettings {
  const value = structuredClone(saved.value);
  value.extensions = { ...value.extensions, theme };
  return { expected_revision: saved.revision, value };
}

export function mergeActivatedTheme(
  draft: PublicSettings,
  saved: PublicSettings,
): PublicSettings {
  return {
    ...draft,
    extensions: { ...draft.extensions, theme: saved.extensions?.theme ?? "" },
  };
}
