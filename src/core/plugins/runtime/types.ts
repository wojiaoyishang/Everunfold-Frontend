import type { CustomPageDefinition } from "@/core/pages/registration";
import type { PluginShortcode } from "@/core/plugins/types";
import type { FontDefinition } from "@/core/fonts/types";
import type { BuilderComponentDefinition } from "@/core/builder/types";

export interface PluginPackage {
  author?: string;
  homepage?: string;
  license?: string;
  preview?: string;
  readme?: string;
  version?: string;
  protocol: "plugin-package-1";
  sdk: 1;
  directory: string;
  id: string;
  title: string;
  description: string;
  build: string;
  development: boolean;
  entries: { node: string; shared: string; browser?: string; css?: string };
  assets: Record<string, { sha256: string; bytes: number }>;
  components: readonly string[];
  pages: readonly CustomPageDefinition[];
  shortcodes: readonly Omit<PluginShortcode, "render" | "preview">[];
  fonts?: readonly FontDefinition[];
  builderComponents?: readonly BuilderComponentDefinition[];
}
export type PublicPluginPackage = Omit<PluginPackage, "entries" | "assets"> & {
  entries: Omit<PluginPackage["entries"], "node">;
  assets: Record<string, { sha256: string; bytes: number }>;
};
export interface RuntimeCatalog {
  protocol: "plugin-catalog-1";
  revision: string;
  theme: string;
  disabled: readonly string[];
  plugins: readonly PublicPluginPackage[];
  errors: readonly { directory: string; message: string }[];
  development: boolean;
}
