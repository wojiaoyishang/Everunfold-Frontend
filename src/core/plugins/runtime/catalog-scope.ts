import type { PluginPackage, RuntimeCatalog } from "./types";

export function scopePluginCatalog<T extends { manifest: PluginPackage }>(
  installed: { packages: T[]; errors: RuntimeCatalog["errors"] },
  disabled: readonly string[],
  surface?: "admin",
) {
  const packages = installed.packages.filter(
    (item) => item.manifest.surface === surface,
  );
  const ids = new Set(packages.map((item) => item.manifest.id));
  const publicDirectories = new Set(
    installed.packages
      .filter((item) => item.manifest.surface === undefined)
      .map((item) => item.manifest.directory),
  );
  // Unverified packages may be admin-only. Report those build errors in the workspace.
  const errors = installed.errors.filter(({ directory }) =>
    surface === "admin"
      ? !publicDirectories.has(directory)
      : publicDirectories.has(directory),
  );
  return { packages, disabled: disabled.filter((id) => ids.has(id)), errors };
}
