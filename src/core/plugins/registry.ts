import { runtimeStore, type PluginRegistry } from "./runtime/store";

/** Always resolve against the current complete registry; no plugin source is bundled by the host. */
export const pluginRegistry: PluginRegistry = new Proxy({} as PluginRegistry, {
  get(_target, property) {
    return Reflect.get(runtimeStore().active, property);
  },
});
export const allPluginRegistry: PluginRegistry = new Proxy(
  {} as PluginRegistry,
  {
    get(_target, property) {
      return Reflect.get(runtimeStore().all, property);
    },
  },
);
