import { configurationEnvironment } from "../../src/core/config/deployment";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runtimeLog } from "../../src/server/runtime-log";
import { readConfigurationFiles } from "../../src/core/config/files";
import { readInstalledPlugins } from "../../src/server/plugins/packages";
import {
  syncErrorDetails,
  syncFailure,
  syncTarget,
  SyncValidationError,
} from "../../src/server/sync-diagnostics";

async function registration(
  response: Response,
  node: string,
): Promise<boolean> {
  const reader = response.body?.getReader();
  if (!reader) return false;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 8192) return false;
      chunks.push(part.value);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return (
      value?.success === true &&
      value?.code === response.status &&
      value?.data?.node_id === node &&
      value?.data?.registered === true
    );
  } finally {
    await reader.cancel();
  }
}

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
    acceptedToken = "",
    lastReport = 0,
    lastFailure = "",
    lastErrorLog = 0;
  const cycle = async () => {
    const context: Parameters<typeof syncFailure>[0] = {
      direction: "frontend_to_backend",
      operation: "register extensions",
    };
    let failure = "inventory_config_invalid";
    try {
      const { settings: config, file } = readConfigurationFiles(root);
      context.config_file = file.filename;
      context.token_env = config.backend.nextjsToFastapiTokenEnv;
      const url = `${config.backend.baseUrl}/internal/extensions/${encodeURIComponent(config.frontendNodeId)}`;
      context.target = syncTarget(url);
      context.node_id = config.frontendNodeId;
      context.operation = "POST /internal/extensions/{node_id}";
      const token =
        configurationEnvironment(config)[
          config.backend.nextjsToFastapiTokenEnv ?? ""
        ];
      failure = "inventory_token_missing";
      if (!token) throw new SyncValidationError(failure);
      failure = "inventory_read_failed";
      const inventory = await readInventory(
        root,
        pluginDirectory ?? path.resolve(root, config.plugins.directory),
      );
      const body = JSON.stringify(inventory);
      const destination = [
        config.frontendNodeId,
        config.backend.baseUrl,
        config.settings.sourceEpoch,
        config.publicSiteUrl,
      ];
      const report = JSON.stringify([destination, body]);
      if (
        lastFailure ||
        report !== accepted ||
        token !== acceptedToken ||
        Date.now() - lastReport > 60000
      ) {
        failure = "backend_network";
        const response = await fetch(url, {
          method: "POST",
          redirect: "manual",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Everunfold-Public-Url": config.publicSiteUrl ?? "",
          },
          body,
          signal: AbortSignal.timeout(5000),
        });
        context.status = response.status;
        if (!response.ok) {
          failure =
            response.status === 403
              ? "inventory_forbidden"
              : response.status === 422
                ? "inventory_schema_invalid"
                : response.status === 413
                  ? "inventory_too_large"
                  : "backend_http";
          await response.body?.cancel();
          throw new SyncValidationError(failure);
        }
        failure = "inventory_invalid_response";
        if (!(await registration(response, config.frontendNodeId)))
          throw new SyncValidationError(failure);
        if (lastFailure || report !== accepted)
          runtimeLog(
            "info",
            "sync",
            lastFailure ? "扩展清单上报已恢复" : "扩展清单上报成功",
            {
              ...context,
              code: "inventory_registered",
            },
          );
        lastFailure = "";
        accepted = report;
        acceptedToken = token;
        lastReport = Date.now();
      }
    } catch (error) {
      const signature = JSON.stringify([
        context,
        failure,
        syncErrorDetails(error),
      ]);
      // Keep retrying; show changed failures immediately and repeat unchanged failures every 30s.
      if (signature !== lastFailure || Date.now() - lastErrorLog >= 30000) {
        syncFailure(context, failure, error);
        lastErrorLog = Date.now();
      }
      lastFailure = signature;
    }
    if (!stopped) timer = setTimeout(() => void cycle(), 3000);
  };
  void cycle();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
