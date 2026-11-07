import type { PluginPackage } from "../../src/core/plugins/runtime/types";
export const projectRoot: string;
export function buildPlugin(
  root: string,
  directory: string,
  options?: { output?: string; development?: boolean },
): Promise<PluginPackage>;
export function buildPlugins(
  root?: string,
  options?: { output?: string; development?: boolean },
): Promise<PluginPackage[]>;
