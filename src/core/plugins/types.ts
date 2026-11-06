import type { Content } from "@/core/content/types";
import type { PublicShortcode } from "@/core/contracts/settings";
import type { CustomPageDefinition } from "@/core/pages/registration";

export interface ShortcodeRenderContext {
  parameters: Readonly<Record<string, string>>;
  body: string;
  media: Content["media_urls"];
  escape: (value: string) => string;
}

/** Contributions belong to a trusted plugin, never to a downloaded database module. */
export interface PluginShortcode {
  definition: PublicShortcode;
  render: (context: ShortcodeRenderContext) => string;
  preview?: (context: ShortcodeRenderContext) => string | null;
  classNames?: readonly string[];
  mediaPicker?: {
    parameter: string;
    kind: "image";
    limit: number;
    buttonLabel: string;
    title: string;
  };
}

export interface FrontendPlugin {
  id: string;
  version: string;
  setup: (context: {
    shortcodes: { register: (shortcode: PluginShortcode) => void };
    pages: { register: (page: CustomPageDefinition) => void };
    components: { register: (name: string) => void };
  }) => void;
}

export interface RegisteredPluginShortcode extends PluginShortcode {
  pluginId: string;
  pluginVersion: string;
}
