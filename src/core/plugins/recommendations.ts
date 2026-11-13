import type {
  BackendPluginInfo,
  InstalledPlugin,
  InstalledTheme,
  NodeExtensionInventory,
} from "@/core/contracts/settings";

type PluginDeployment = {
  plugins: readonly InstalledPlugin[];
  backendPlugins: readonly BackendPluginInfo[];
  backendInSync: boolean;
  nodes: readonly NodeExtensionInventory[];
};

export function themePluginRecommendations(
  themes: readonly InstalledTheme[],
  activeTheme: string,
): readonly string[] {
  const visited = new Set<string>();
  let id = activeTheme;
  while (id && !visited.has(id)) {
    const theme = themes.find((item) => item.id === id);
    if (theme?.recommended_plugins != null) return theme.recommended_plugins;
    visited.add(id);
    id = theme?.parent ?? "";
  }
  return [];
}

export function isPluginReady(deployed: PluginDeployment, id: string): boolean {
  const frontend = deployed.plugins.find((plugin) => plugin.id === id);
  const backend = deployed.backendPlugins.some((plugin) => plugin.id === id);
  return Boolean(
    (frontend || backend) &&
    (!backend || deployed.backendInSync) &&
    (!frontend ||
      (deployed.nodes.length > 0 &&
        deployed.nodes.every((node) =>
          node.inventory?.plugins?.some(
            (plugin) => plugin.id === id && plugin.build === frontend.build,
          ),
        ))),
  );
}

export function planRecommendedActivation(
  deployed: PluginDeployment,
  recommendations: readonly string[],
) {
  const required = new Set(recommendations);
  const backend = new Map(
    deployed.backendPlugins.map((plugin) => [plugin.id, plugin]),
  );
  // Set iteration also visits dependencies appended by earlier iterations.
  for (const id of required)
    for (const dependency of backend.get(id)?.requires ?? [])
      required.add(dependency);
  return {
    required,
    unavailable: [...required].filter((id) => !isPluginReady(deployed, id)),
  };
}
