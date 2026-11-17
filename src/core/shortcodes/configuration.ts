import type {
  PublicSettings,
  PublicShortcode,
} from "@/core/contracts/settings";

export const defaultShortcodeDepth = 32;
export const maximumShortcodeDepth = 64;

export type ShortcodeConfiguration = {
  definitions: readonly PublicShortcode[];
  maxDepth?: number;
};

export type RenderShortcodes =
  ShortcodeConfiguration | readonly PublicShortcode[];

export function shortcodeConfiguration(
  source: RenderShortcodes = [],
): ShortcodeConfiguration {
  return "definitions" in source ? source : { definitions: source };
}

export function siteShortcodes(
  settings?: PublicSettings | null,
): ShortcodeConfiguration {
  return {
    definitions: settings?.shortcodes ?? [],
    maxDepth: settings?.site.writing?.shortcode_max_depth,
  };
}
