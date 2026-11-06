import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createPluginRegistry } from "../src/core/plugins/create-registry";
import type {
  FrontendPlugin,
  PluginShortcode,
} from "../src/core/plugins/types";
import { pluginRegistry } from "../src/core/plugins/registry";
import { collectCustomPages } from "../src/core/pages/registration";
import { parsePageConfiguration } from "../src/core/pages/configuration";
import { renderContent } from "../src/core/rendering/content";
import { discoverExtensions } from "../tools/extensions/discovery";
import { readExtensionCatalog } from "../tools/extensions/catalog";
import { content } from "./fixtures";

const contribution: PluginShortcode = {
  definition: {
    id: "12345678-1234-4234-8234-123456789abc",
    name: "fixture",
    title: "Fixture",
    description: "",
    kind: "container",
    revision: 1,
    scope: "ef-sc-12345678123442348234123456789abc",
    parameters: [],
    html: "",
    css: "",
  },
  render: ({ body }) => `<section>${body}</section>`,
};
const plugin: FrontendPlugin = {
  id: "fixture.plugin",
  version: "1.0.0",
  setup: ({ shortcodes }) => shortcodes.register(contribution),
};

test("only plugin setup contributes shortcodes, with owner identity and atomic collision checks", () => {
  assert.equal(createPluginRegistry([]).shortcodes.length, 0);
  const registry = createPluginRegistry([plugin]);
  assert.equal(registry.shortcodes[0].pluginId, "fixture.plugin");
  assert.equal(
    registry.shortcode(contribution.definition)?.render({
      body: "<p>ok</p>",
      parameters: {},
      media: {},
      escape: String,
    }),
    "<section><p>ok</p></section>",
  );
  assert.equal(
    registry.shortcode({ ...contribution.definition, id: "unknown" }),
    undefined,
  );
  assert.throws(
    () => createPluginRegistry([plugin, plugin]),
    /duplicate frontend plugin/,
  );
  assert.throws(
    () => createPluginRegistry([plugin, { ...plugin, id: "fixture.other" }]),
    /duplicate plugin shortcode/,
  );
  assert.throws(
    () => createPluginRegistry([plugin], [contribution.definition]),
    /duplicate plugin shortcode/,
  );
  assert.equal(createPluginRegistry([]).shortcodes.length, 0);
});

test("plugin setup cannot register late, use async initialization, or take the custom namespace", () => {
  let late = () => {};
  createPluginRegistry([
    {
      ...plugin,
      setup({ shortcodes }) {
        late = () => shortcodes.register(contribution);
      },
    },
  ]);
  assert.throws(late, /setup has finished/);
  assert.throws(
    () => createPluginRegistry([{ ...plugin, async setup() {} }]),
    /must be synchronous/,
  );
  assert.throws(
    () =>
      createPluginRegistry([
        {
          ...plugin,
          setup({ shortcodes }) {
            shortcodes.register({
              ...contribution,
              definition: {
                ...contribution.definition,
                name: "custom:occupied",
              },
            });
          },
        },
      ]),
    /Invalid or duplicate/,
  );
});

test("a plugin supplies catalog preview, media controls and CSS only for articles that use it", () => {
  const gallery = pluginRegistry.shortcodes.find(
    (d) => d.definition.name === "gallery",
  )!;
  assert.equal(gallery.pluginId, "core.gallery");
  assert.equal(gallery.mediaPicker?.parameter, "id");
  const plain = renderContent(
    content({
      content: [{ id: "plain", type: "markdown", content: "Plain article" }],
    }),
  );
  assert.doesNotMatch(plain.html, /ef-gallery|data-shortcodes/);
  const sample = renderContent(
    content({
      content: [{ id: "sample", type: "markdown", content: "{{< gallery >}}" }],
    }),
    [],
    { shortcodePreview: true },
  );
  assert.deepEqual(sample.diagnostics, []);
  assert.match(sample.html, /ef-gallery-sample/);
  assert.match(sample.html, /data-shortcodes/);
  const real = renderContent(
    content({
      content: [{ id: "real", type: "markdown", content: "{{< gallery >}}" }],
    }),
  );
  assert.ok(real.diagnostics.length);
  assert.doesNotMatch(real.html, /ef-gallery-sample|data-shortcodes/);
});

test("page storage configuration accepts undeclared nested JSON without dropping keys", () => {
  const source =
    '{"people":[],"extra":{"nested":[true,0,null,{"未知":"ok"}]},"__proto__":{"value":1}}';
  const parsed = parsePageConfiguration(source);
  assert.equal(parsed.error, "");
  assert.deepEqual(parsed.value, JSON.parse(source));
  assert.equal(({} as Record<string, unknown>).value, undefined);
  for (const invalid of [
    "{",
    "[]",
    "null",
    '{"number":1e999}',
    JSON.stringify({ text: "a".repeat(262144) }),
  ])
    assert.ok(parsePageConfiguration(invalid).error);
  let nested: unknown = null;
  for (let i = 0; i < 34; i++) nested = { next: nested };
  assert.ok(parsePageConfiguration(JSON.stringify(nested)).error);
});

test("page capabilities come from their definitions and duplicate IDs or paths fail", () => {
  const definition = {
    registration: {
      id: "fixture.page",
      version: "1.0.0",
      title: "Fixture",
      path: "/fixture",
      defaults: { nested: [true, null] },
    },
    localized: true,
  };
  const result = collectCustomPages([definition]);
  assert.ok(result.localized.has("fixture.page"));
  assert.deepEqual(result.manifest.pages[0].defaults, { nested: [true, null] });
  assert.throws(
    () => collectCustomPages([definition, definition]),
    /duplicate custom page/,
  );
  assert.throws(
    () =>
      collectCustomPages([
        definition,
        { registration: { ...definition.registration, id: "fixture.other" } },
      ]),
    /duplicate custom page/,
  );
});

test("adding and removing directories changes the discovered catalog without editing central files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-extensions-"));
  try {
    await mkdir(path.join(root, "src/themes"), { recursive: true });
    await mkdir(path.join(root, "src/plugins"), { recursive: true });
    assert.deepEqual(await discoverExtensions(root, "themes"), []);
    const page = path.join(root, "src/themes/fixture");
    await mkdir(page);
    await assert.rejects(
      discoverExtensions(root, "themes"),
      /Missing extension entry/,
    );
    await writeFile(
      path.join(page, "theme.ts"),
      'export default { id:"fixture", version:"1.0.0", components:["form.custom"] };',
    );
    await writeFile(
      path.join(page, "render.tsx"),
      "export default function View(){ return null; }",
    );
    const pluginDir = path.join(root, "src/plugins/fixture");
    await mkdir(pluginDir);
    await writeFile(
      path.join(pluginDir, "plugin.ts"),
      'export default { id:"fixture.plugin", version:"1.0.0", setup({pages}){ pages.register({ registration:{id:"fixture.page",version:"1.0.0",title:"Fixture",path:"/fixture",defaults:{a:[true,null]}}, component:"unregistered.page", localized:true }); } };',
    );
    const catalog = await readExtensionCatalog(root);
    assert.deepEqual(catalog.pages, ["fixture.page"]);
    assert.deepEqual(catalog.plugins, ["fixture"]);
    assert.deepEqual(catalog.themes, ["fixture"]);
    assert.deepEqual(catalog.manifest.pages[0].defaults, { a: [true, null] });
    await rm(pluginDir, { recursive: true });
    assert.deepEqual(await discoverExtensions(root, "plugins"), []);
    await symlink(page, path.join(root, "src/themes/linked"), "dir");
    await assert.rejects(discoverExtensions(root, "themes"), /symlinks/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
