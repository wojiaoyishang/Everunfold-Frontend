import { createPluginRegistry } from "../create-registry";
import type { FrontendPlugin } from "../types";

export type PluginRegistry = ReturnType<typeof createPluginRegistry>;
interface RuntimeStore {
  key: string;
  all: PluginRegistry;
  active: PluginRegistry;
  disabled: ReadonlySet<string>;
}
const initial = (): RuntimeStore => ({
  key: "",
  all: createPluginRegistry([]),
  active: createPluginRegistry([]),
  disabled: new Set(),
});
const root = globalThis as typeof globalThis & {
  __everunfoldPluginStore?: RuntimeStore;
};
export const runtimeStore = () => (root.__everunfoldPluginStore ??= initial());

export function installRuntimePlugins(
  plugins: readonly FrontendPlugin[],
  disabled: readonly string[],
  key: string,
) {
  const current = runtimeStore();
  if (current.key === key) return;
  const all = createPluginRegistry(plugins);
  const active = createPluginRegistry(
    plugins.filter((plugin) => !disabled.includes(plugin.id)),
  );
  root.__everunfoldPluginStore = {
    key,
    all,
    active,
    disabled: new Set(disabled),
  };
}
