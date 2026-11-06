import { collectThemes } from "../../src/core/extensions/component-descriptors";
import type { ThemeDefinition } from "../../src/core/extensions/types";
import { pathToFileURL } from "node:url";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { discoverExtensions } from "./discovery";
import { collectCustomPages } from "../../src/core/pages/registration";
import { createPluginRegistry } from "../../src/core/plugins/create-registry";
import type { FrontendPlugin } from "../../src/core/plugins/types";
import schema from "@/core/contracts/pages-v1-schema";
import builtins from "@/core/contracts/shortcode-builtins";

export async function readExtensionCatalog(root: string) {
  const themes = await discoverExtensions(root, "themes");
  const plugins = await discoverExtensions(root, "plugins");
  const load = async <T>(kind: string, name: string): Promise<T> =>
    (
      await import(
        pathToFileURL(
          path.join(
            root,
            "src",
            kind,
            name,
            kind === "themes" ? "theme.ts" : "plugin.ts",
          ),
        ).href
      )
    ).default as T;
  const implementations = await Promise.all(
    plugins.map((name) => load<FrontendPlugin>("plugins", name)),
  );
  const registry = createPluginRegistry(
    implementations,
    builtins.map((d) => d.compiled),
  );
  const collected = collectCustomPages(registry.pages);
  collectThemes(
    await Promise.all(
      themes.map((name) => load<ThemeDefinition>("themes", name)),
    ),
  );
  const ajv = new Ajv({ strict: true });
  addFormats(ajv);
  const validate = ajv.compile({
    $defs: schema.$defs,
    $ref: "#/$defs/PageManifest",
  });
  if (!validate(collected.manifest))
    throw new Error(
      "Invalid page manifest: " + ajv.errorsText(validate.errors),
    );
  return {
    pages: registry.pages.map((page) => page.registration.id),
    plugins,
    themes,
    manifest: collected.manifest,
    registry,
  };
}
