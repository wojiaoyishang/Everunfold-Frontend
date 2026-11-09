/** Stable plugin authoring contract. Runtime capabilities live in the client entry. */
export type {
  FrontendPlugin,
  PluginShortcode,
  ShortcodeRenderContext,
} from "@/core/plugins/types";
export type { SettingsModel, SettingField } from "@/core/forms/schema";
export type { FormFieldProps } from "@/core/forms/renderer";
export type { CustomPageDefinition } from "@/core/pages/registration";
export type { CustomPageProps } from "@/core/pages/registered-view";
export type {
  ThemeTemplateProps,
  ThemeSlotProps,
} from "@/core/extensions/types";
export type { Content, ReadableContent, Site } from "@/core/content/types";
export type {
  PluginDataDriver,
  PluginDataValue,
} from "@/core/plugin-data/source";
import type { FrontendPlugin } from "@/core/plugins/types";

export function definePlugin<T extends FrontendPlugin>(plugin: T): T {
  return plugin;
}

export type { MediaItem, MediaQuery } from "@/core/contracts/settings";
export type { ThemeDefinition } from "@/core/extensions/types";
export {
  defineFont,
  fontStack,
  registeredFontFamily,
} from "../core/fonts/registry";
export type {
  FontDefinition,
  RegisteredFontFace,
  ThemeTypography,
} from "../core/fonts/types";
export interface PluginActivationContext {
  components: {
    register(
      name: string,
      component: import("react").ComponentType<Record<string, unknown>>,
    ): void;
  };
  onDispose(callback: () => void): void;
}
