import { readFile } from "node:fs/promises";
import path from "node:path";
import { readConfigurationFiles } from "../../src/core/config/files";
import { readInstalledPlugins } from "../../src/server/plugins/packages";

export async function readInventory(root: string, pluginDirectory?: string) {
  const themes = JSON.parse(
    await readFile(
      path.join(root, "var/cache/build/theme-catalog.json"),
      "utf8",
    ),
  );
  const installed = await readInstalledPlugins(
    pluginDirectory ?? path.join(root, "plugins"),
    path.join(root, "var/cache/plugin-packages"),
  );
  return {
    protocol: "extensions-1",
    themes,
    plugins: installed.packages.map(({ manifest: p }) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      version: p.version ?? "1.0.0",
      author: p.author ?? "",
      homepage: p.homepage ?? "",
      license: p.license ?? "",
      preview: p.preview ?? "",
      readme: p.readme ?? "",
      build: p.build,
      page_ids: p.pages.map((page) => page.registration.id),
      components: p.components,
      shortcodes: p.shortcodes.map((shortcode) => shortcode.definition.name),
    })),
    pages: {
      protocol: "pages-1",
      pages: installed.packages.flatMap((p) =>
        p.manifest.pages.map((page) => page.registration),
      ),
    },
  };
}
/** Metadata only: no executable code, configuration secrets or private page data leave Node. */
export function watchInventory(root: string, pluginDirectory?: string) {
  let stopped = false,
    timer: ReturnType<typeof setTimeout>,
    accepted = "",
    lastReport = 0;
  const cycle = async () => {
    try {
      const { settings: config } = readConfigurationFiles(root);
      const token = process.env[config.backend.nextjsToFastapiTokenEnv ?? ""];
      if (!token) throw new Error("missing deployment token");
      const inventory = await readInventory(
        root,
        pluginDirectory ?? path.resolve(root, config.plugins.directory),
      );
      const body = JSON.stringify(inventory);
      const destination = [
        config.frontendNodeId,
        config.backend.baseUrl,
        config.settings.sourceEpoch,
      ];
      const report = JSON.stringify([destination, body]);
      if (report !== accepted || Date.now() - lastReport > 60000) {
        const response = await fetch(
          `${config.backend.baseUrl}/internal/extensions/${encodeURIComponent(config.frontendNodeId)}`,
          {
            method: "POST",
            redirect: "error",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body,
            signal: AbortSignal.timeout(5000),
          },
        );
        if (!response.ok) throw new Error("inventory registration unavailable");
        accepted = report;
        lastReport = Date.now();
      }
    } catch {
      /* Backend outages must not stop the frontend; retry without logging credentials. */
    }
    if (!stopped) timer = setTimeout(() => void cycle(), 3000);
  };
  void cycle();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
