import assert from "node:assert/strict";
import test from "node:test";
import {
  defineFont,
  createFontRegistry,
  inheritedTypography,
  normalizeTypography,
  fontStack,
} from "../src/core/fonts/registry";
import { collectThemes } from "../src/core/extensions/component-descriptors";
import { createPluginRegistry } from "../src/core/plugins/create-registry";

const used = defineFont({
  id: "sample.body",
  label: "Body",
  fallbacks: ["Georgia", "serif"],
  faces: [
    {
      src: "/reference/fonts/body.woff2",
      format: "woff2",
      weight: [300, 800],
      unicodeRange: "U+0000-00FF",
    },
  ],
});
test("themes and plugins use immutable font declarations, and only referenced faces become CSS", () => {
  const unused = defineFont({
    ...used,
    id: "sample.unused",
    faces: [{ src: "/reference/fonts/unused.woff2", format: "woff2" }],
  });
  const registry = createFontRegistry([used, used, unused]);
  assert.equal(registry.all.length, 2);
  const css = registry.css([used.id, used.id, "missing.font"]);
  assert.equal((css.match(/@font-face/g) ?? []).length, 1);
  assert.match(css, /font-display:swap/);
  assert.match(css, /font-weight:300 800/);
  assert.match(css, /unicode-range:U\+0000-00FF/);
  assert.doesNotMatch(css, /unused/);
  assert.equal(registry.css([]), "");
  assert.equal(registry.css(["missing.font"]), "");
  assert.match(fontStack(used), /Georgia.*serif/);
  assert.ok(Object.isFrozen(used.faces));
  const theme = collectThemes([
    { id: "argon", version: "1.0.0" },
    { id: "sample", version: "1.0.0", fonts: [used] },
  ]);
  assert.equal(theme.get("sample")?.fonts?.[0]?.id, used.id);
  const plugin = createPluginRegistry([
    {
      id: "sample.plugin",
      version: "1.0.0",
      setup: (api) =>
        api.fonts.register(defineFont({ ...used, id: "sample.plugin.body" })),
    },
  ]);
  assert.equal(plugin.fonts[0].id, "sample.plugin.body");
  assert.throws(
    () => createFontRegistry([used, { ...used, label: "Different" }]),
    /Conflicting/,
  );
});
test("font validation prevents stylesheet injection and invalid resources, weights and namespaces", () => {
  for (const src of [
    "javascript:alert(1)",
    "data:font/woff2,AAAA",
    "//evil.test/x",
    "/x</style>",
    "https://u:p@example.test/font.woff2",
    "asset:../font.woff2",
  ])
    assert.throws(() =>
      defineFont({ ...used, faces: [{ src, format: "woff2" }] }),
    );
  for (const weight of [
    [800, 200],
    [0, 400],
    [100, 1001],
  ])
    assert.throws(() =>
      defineFont({
        ...used,
        faces: [
          {
            src: "/font.woff2",
            format: "woff2",
            weight: weight as [number, number],
          },
        ],
      }),
    );
  assert.throws(() =>
    defineFont({
      ...used,
      faces: [
        {
          src: "/font.woff2",
          format: "woff2",
          unicodeRange: "U+0000;}body{color:red",
        },
      ],
    }),
  );
  assert.throws(() =>
    collectThemes([{ id: "argon", version: "1.0.0", fonts: [used] }]),
  );
  assert.throws(() =>
    createPluginRegistry([
      {
        id: "other.plugin",
        version: "1.0.0",
        setup: (api) => api.fonts.register(used),
      },
    ]),
  );
});
test("child typography overrides individual roles, null resets inheritance, and system stacks need no files", () => {
  const parent = normalizeTypography({ body: used.id, code: "system.mono" });
  const child = normalizeTypography({
    body: null,
    heading: "sample.heading",
    code: undefined,
  });
  assert.deepEqual(
    inheritedTypography([{ typography: child }, { typography: parent }]),
    { body: null, code: "system.mono", heading: "sample.heading" },
  );
  assert.equal(parent.body, used.id);
  assert.throws(() => normalizeTypography({ body: "font;injection" }));
  const system = createFontRegistry([
    { id: "sample.system", label: "System", fallbacks: ["system-ui"] },
  ]);
  assert.equal(system.css(["sample.system"]), "");
});
