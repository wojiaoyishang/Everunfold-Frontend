/** Stable plugin authoring contract. Runtime capabilities live in the client entry. */
export type { CaptchaWidgetProps } from "./captcha";
export type {
  FrontendPlugin,
  PluginShortcode,
  ShortcodeRenderContext,
} from "@/core/plugins/types";
export type { SettingsModel, SettingField } from "@/core/forms/schema";
export type { FormFieldProps } from "@/core/forms/renderer";
export type {
  CustomPageDefinition,
  PageCommentsPlacement,
  PageImageViewerOptions,
} from "@/core/pages/registration";
export type { PageCommentsContextValue } from "@/core/pages/comments";
export type { PageCommentInput } from "@/core/pages/comment-client";
export type { CaptchaController } from "@/core/captcha/use-captcha";
export type { PublicComment } from "@/core/content/types";
export type { CustomPageProps } from "@/core/pages/registered-view";
export type { PageCategory } from "@/core/contracts/pages";
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
