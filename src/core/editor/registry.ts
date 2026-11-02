export interface BlockEditorPlugin<Adapter> {
  id: string;
  version: string;
  format: "markdown" | "html";
  label: string;
  adapter: Adapter;
}

/** Trusted compile-time registration; persisted content types never contain executable code. */
export function createBlockEditorRegistry<Adapter>(
  plugins: readonly BlockEditorPlugin<Adapter>[],
) {
  const ids = new Set<string>(),
    formats = new Set<string>();
  for (const plugin of plugins) {
    if (ids.has(plugin.id) || formats.has(plugin.format))
      throw new Error("编辑器注册重复");
    ids.add(plugin.id);
    formats.add(plugin.format);
  }
  const entries = Object.freeze(
    plugins.map((plugin) => Object.freeze({ ...plugin })),
  );
  return Object.freeze({
    entries,
    get: (format: string) => entries.find((p) => p.format === format),
  });
}
