import { build } from "esbuild";
import { transformAsync } from "@babel/core";
import refreshPlugin from "react-refresh/babel";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readdir, readFile, mkdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { writeArtifact } from "../write-artifact.mjs";
import { createPluginRegistry } from "../../src/core/plugins/create-registry.ts";
import {
  SDK_CLIENT_EXPORTS,
  REACT_EXPORTS,
  SDK_RUNTIME_KEY,
} from "../../src/sdk/protocol.ts";

const require = createRequire(import.meta.url);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const bridge = (name, exports, defaultExport = false) =>
  `const sdk=globalThis[Symbol.for(${JSON.stringify(SDK_RUNTIME_KEY)})];if(!sdk)throw new Error("Plugin SDK is not ready");const source=sdk[${JSON.stringify(name)}];${exports.map((key) => `export const ${key}=source.${key};`).join("\n")}${defaultExport ? "export default source;" : ""}`;

function sourceBoundary(root, directory, shared = false) {
  return {
    name: "plugin-source-boundary",
    setup(builder) {
      builder.onResolve({ filter: /^@\// }, () => ({
        errors: [
          {
            text: "Plugins must use the public @everunfold/plugin-sdk; host source imports are not supported.",
          },
        ],
      }));
      if (shared)
        builder.onResolve(
          {
            filter:
              /^(?:react(?:-dom)?(?:\/.*)?|@everunfold\/plugin-sdk\/client)$/,
          },
          () => ({
            errors: [
              {
                text: "Shared plugin declarations must be independent of React and browser capabilities.",
              },
            ],
          }),
        );
      builder.onResolve({ filter: /^\./ }, (args) => {
        const base = path.join(root, "src/plugins", directory) + path.sep;
        if (
          args.resolveDir.startsWith(base.slice(0, -1)) &&
          !path.resolve(args.resolveDir, args.path).startsWith(base)
        )
          return {
            errors: [
              { text: "Plugin imports may not escape their source directory." },
            ],
          };
      });
    },
  };
}

function clientAdapter(root, directory, id, development) {
  return {
    name: "everunfold-plugin-sdk",
    setup(builder) {
      builder.onResolve(
        {
          filter:
            /^(?:react(?:\/jsx(?:-dev)?-runtime)?|react-dom|@everunfold\/plugin-sdk\/client)$/,
        },
        (args) => ({ path: args.path, namespace: "sdk" }),
      );
      builder.onLoad({ filter: /.*/, namespace: "sdk" }, (args) => ({
        contents:
          args.path === "react"
            ? bridge("react", REACT_EXPORTS, true)
            : args.path === "react-dom"
              ? bridge("reactDOM", ["createPortal", "flushSync"])
              : args.path === "react/jsx-runtime"
                ? bridge("jsx", ["jsx", "jsxs", "Fragment"])
                : args.path === "react/jsx-dev-runtime"
                  ? bridge("jsxDev", ["jsxDEV", "Fragment"])
                  : bridge("client", SDK_CLIENT_EXPORTS),
        loader: "js",
      }));
      builder.onResolve({ filter: /^@\// }, () => ({
        errors: [
          {
            text: "Plugins must import the public @everunfold/plugin-sdk instead of host source files.",
          },
        ],
      }));
      builder.onResolve({ filter: /\.module\.css$/ }, (args) => {
        const original = path.resolve(args.resolveDir, args.path);
        return {
          path: path.join(
            path.dirname(original),
            id.replaceAll(/[^a-zA-Z0-9]/g, "_") + "_" + path.basename(original),
          ),
          namespace: "plugin-css",
          pluginData: { original },
        };
      });
      builder.onLoad(
        { filter: /.*/, namespace: "plugin-css" },
        async (args) => ({
          contents: await readFile(args.pluginData.original, "utf8"),
          loader: "local-css",
          resolveDir: path.dirname(args.pluginData.original),
          watchFiles: [args.pluginData.original],
        }),
      );
      if (development)
        builder.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
          if (
            !args.path.startsWith(
              path.join(root, "src/plugins", directory) + path.sep,
            )
          )
            return;
          const source = await readFile(args.path, "utf8");
          const result = await transformAsync(source, {
            babelrc: false,
            configFile: false,
            filename: args.path,
            parserOpts: { plugins: ["typescript", "jsx"] },
            plugins: [[refreshPlugin, { skipEnvCheck: true }]],
            sourceMaps: "inline",
          });
          const moduleId = `${id}/${path.relative(path.join(root, "src/plugins", directory), args.path).replaceAll("\\", "/")}`;
          const prelude = `const $RefreshReg$=(type,name)=>globalThis[Symbol.for(${JSON.stringify(SDK_RUNTIME_KEY)})].refresh.register(type,${JSON.stringify(moduleId)}+":"+name);const $RefreshSig$=globalThis[Symbol.for(${JSON.stringify(SDK_RUNTIME_KEY)})].refresh.createSignatureFunctionForTransform;\n`;
          return {
            contents: prelude + result.code,
            loader: args.path.endsWith("x") ? "tsx" : "ts",
            resolveDir: path.dirname(args.path),
          };
        });
    },
  };
}

export async function buildPlugin(
  root,
  directory,
  { output = path.join(root, "plugins"), development = false } = {},
) {
  if (!/^[a-z][a-z0-9-]*$/.test(directory))
    throw new Error("Invalid plugin directory");
  const source = path.join(root, "src/plugins", directory);
  if (
    !(await lstat(source)).isDirectory() ||
    (await lstat(source)).isSymbolicLink()
  )
    throw new Error("Plugin source must be a local directory");
  const target = path.join(output, directory);
  await mkdir(target, { recursive: true });
  const options = {
    absWorkingDir: root,
    bundle: true,
    write: false,
    target: "es2022",
    logLevel: "silent",
    tsconfig: path.join(root, "tsconfig.json"),
    minifySyntax: !development,
    minifyWhitespace: !development,
    minifyIdentifiers: false,
    legalComments: "none",
  };
  const shared = await build({
    ...options,
    entryPoints: [path.join(source, "plugin.ts")],
    platform: "neutral",
    format: "cjs",
    plugins: [sourceBoundary(root, directory, true)],
  });
  const cjs = shared.outputFiles[0].contents;
  const nodeFile = `shared.${digest(cjs)}.cjs`;
  await writeArtifact(path.join(target, nodeFile), Buffer.from(cjs).toString());
  const file = path.join(target, nodeFile);
  delete require.cache[file];
  const plugin = require(file).default;
  delete require.cache[file];
  const registry = createPluginRegistry([plugin]);
  const esm = await build({
    ...options,
    entryPoints: [path.join(source, "plugin.ts")],
    platform: "neutral",
    format: "esm",
    plugins: [sourceBoundary(root, directory, true)],
  });
  const sharedCode = esm.outputFiles[0].contents;
  const sharedFile = `shared.${digest(sharedCode)}.mjs`;
  await writeArtifact(
    path.join(target, sharedFile),
    Buffer.from(sharedCode).toString(),
  );
  const assets = {
    [sharedFile]: { sha256: digest(sharedCode), bytes: sharedCode.length },
  };
  const entries = { node: nodeFile, shared: sharedFile };
  const componentFile = path.join(source, "components.tsx");
  if ((await lstat(componentFile).catch(() => null))?.isFile()) {
    const client = await build({
      ...options,
      entryPoints: [componentFile],
      platform: "browser",
      format: "esm",
      outfile: path.join(target, "browser.js"),
      jsx: "automatic",
      jsxDev: development,
      plugins: [
        sourceBoundary(root, directory),
        clientAdapter(root, directory, plugin.id, development),
      ],
      loader: {
        ".png": "file",
        ".jpg": "file",
        ".jpeg": "file",
        ".gif": "file",
        ".webm": "file",
        ".mp4": "file",
        ".webp": "file",
        ".svg": "file",
        ".woff2": "file",
      },
      assetNames: "asset.[hash]",
      publicPath: `/__plugins/assets/${directory}/`,
    });
    // Give every public asset a full content hash; references survive a package hot swap.
    const renames = new Map();
    for (const file of client.outputFiles) {
      if (!/browser\.(?:js|css)$/.test(file.path))
        renames.set(
          path.basename(file.path),
          `asset.${digest(file.contents)}${path.extname(file.path)}`,
        );
    }
    for (const file of client.outputFiles) {
      const isJs = file.path.endsWith("browser.js"),
        isCss = file.path.endsWith("browser.css");
      let bytes = Buffer.from(file.contents);
      if (isJs || isCss) {
        let text = bytes.toString();
        for (const [from, to] of renames) text = text.replaceAll(from, to);
        bytes = Buffer.from(text);
      }
      const hash = digest(bytes);
      const name = isJs
        ? `browser.${hash}.mjs`
        : isCss
          ? `styles.${hash}.css`
          : renames.get(path.basename(file.path));
      if (isJs) entries.browser = name;
      if (isCss) entries.css = name;
      await writeArtifact(path.join(target, name), bytes);
      assets[name] = { sha256: hash, bytes: bytes.length };
    }
  }
  const manifest = {
    protocol: "plugin-package-1",
    sdk: 1,
    directory,
    id: plugin.id,
    title: plugin.title ?? plugin.id,
    description: plugin.description ?? "",
    development,
    entries,
    assets,
    components: registry.componentNames,
    pages: registry.pages.map(({ pluginId, ...page }) => {
      void pluginId;
      return page;
    }),
    shortcodes: registry.shortcodes.map(
      ({
        render: _render,
        preview: _preview,
        pluginId: _owner,
        pluginVersion: _version,
        ...shortcode
      }) => {
        void _render;
        void _preview;
        void _owner;
        void _version;
        return shortcode;
      },
    ),
  };
  const result = { ...manifest, build: digest(JSON.stringify(manifest)) };
  await writeArtifact(
    path.join(target, "manifest.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  return result;
}
export async function buildPlugins(root = projectRoot, options = {}) {
  const source = path.join(root, "src/plugins");
  const names = (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const results = [];
  for (const name of names)
    results.push(await buildPlugin(root, name, options));
  return results;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: {
      plugin: { type: "string", multiple: true },
      output: { type: "string" },
      dev: { type: "boolean", default: false },
    },
  });
  const options = {
    output: values.output
      ? path.resolve(projectRoot, values.output)
      : undefined,
    development: values.dev,
  };
  const results = values.plugin?.length
    ? await Promise.all(
        values.plugin.map((directory) =>
          buildPlugin(projectRoot, directory, options),
        ),
      )
    : await buildPlugins(projectRoot, options);
  console.log(`Built ${results.length} independent plugin packages.`);
}
