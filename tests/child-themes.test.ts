import assert from "node:assert/strict";
import test from "node:test";
import { collectThemes } from "../src/core/extensions/component-descriptors";
import type { ThemeDefinition } from "../src/core/extensions/types";
import { themeRegistry } from "../src/core/extensions/themes";
import { templateTargets } from "../src/core/themes/targets";
import { parseConfiguration } from "../src/core/config/schema";
import { content } from "./fixtures";

const base: ThemeDefinition = {
  id: "argon",
  version: "1.0.0",
  parent: null,
  components: ["header", "footer", "base.wrapper"],
  templates: { article: "base.wrapper", "content:one": "base.specific" },
  slots: { "article.after": ["base.note"], "shell.after": ["base.footer"] },
};
const child: ThemeDefinition = {
  id: "child",
  version: "1.0.0",
  components: ["header", "child.wrapper"],
  templates: { article: "child.wrapper", "content:one": "child.specific" },
  slots: { "article.after": ["child.note"], "shell.after": false },
};
const grandchild: ThemeDefinition = {
  id: "grandchild",
  version: "1.0.0",
  parent: "child",
  slots: { "shell.after": ["last.note"] },
};

test("child themes resolve parent chains independent of discovery order and preserve the selected context", () => {
  const registry = collectThemes([grandchild, child, base]);
  assert.deepEqual(
    registry.chain("grandchild").map((t) => t.id),
    ["grandchild", "child", "argon"],
  );
  assert.equal(registry.owner("grandchild", "header"), "child");
  assert.equal(registry.owner("grandchild", "footer"), "argon");
  assert.equal(registry.owner("argon", "header"), "argon");
  assert.equal(registry.owner("grandchild", "plugin.new"), undefined);
  assert.ok(Object.isFrozen(registry.chain("grandchild")));
  assert.throws(() => registry.chain("removed"), /Unknown theme/);
});

test("missing parents, implicit missing Argon, self inheritance and cycles fail before serving", () => {
  assert.throws(
    () => collectThemes([{ ...child, parent: "absent" }]),
    /missing parent/,
  );
  assert.throws(() => collectThemes([child]), /missing parent/);
  assert.throws(() => collectThemes([{ ...base, parent: "argon" }]), /Cyclic/);
  assert.throws(
    () => collectThemes([base, { ...child, parent: "grandchild" }, grandchild]),
    /Cyclic/,
  );
  assert.throws(() => collectThemes([base, base]), /duplicate theme/);
  assert.equal(
    collectThemes([{ ...child, parent: null }]).chain("child").length,
    1,
  );
});

test("specific templates win within each level and child wrappers receive the parent result", () => {
  const registry = collectThemes([base, child, grandchild]);
  assert.deepEqual(
    registry.templates("grandchild", "article", ["content:one"]),
    [
      { theme: "argon", component: "base.specific" },
      { theme: "child", component: "child.specific" },
    ],
  );
  assert.deepEqual(
    registry.templates("grandchild", "article", ["content:other"]),
    [
      { theme: "argon", component: "base.wrapper" },
      { theme: "child", component: "child.wrapper" },
    ],
  );
  assert.deepEqual(registry.templates("grandchild", "unregistered"), []);
});

test("hooks append in parent order and a child can clear an inherited insertion without mutating the parent", () => {
  const registry = collectThemes([base, child, grandchild]);
  assert.deepEqual(
    registry.slots("grandchild", "article.after").map((s) => s.component),
    ["base.note", "child.note"],
  );
  assert.deepEqual(registry.slots("child", "shell.after"), []);
  assert.deepEqual(registry.slots("grandchild", "shell.after"), [
    { theme: "grandchild", component: "last.note" },
  ]);
  assert.deepEqual(registry.slots("argon", "shell.after"), [
    { theme: "argon", component: "base.footer" },
  ]);
  assert.deepEqual(registry.slots("child", "toString"), []);
});

test("descriptor copies cannot be changed by later caller mutation, and invalid component names fail", () => {
  const mutable = {
    ...child,
    components: ["one"],
    slots: { "shell.after": ["a"] },
  };
  const registry = collectThemes([base, mutable]);
  mutable.components.push("two");
  mutable.slots["shell.after"].push("b");
  assert.equal(registry.owner("child", "two"), undefined);
  assert.equal(registry.slots("child", "shell.after").length, 2);
  for (const bad of ["", "bad name", "../file"])
    assert.throws(
      () => collectThemes([base, { ...child, components: [bad] }]),
      /Invalid/,
    );
  assert.throws(
    () => collectThemes([base, { ...child, components: ["a", "a"] }]),
    /Invalid/,
  );
});

test("page and content template targets depend on stable identities, never paths or locale", () => {
  const sample = content();
  assert.deepEqual(templateTargets({ content: sample }), [
    `content:${sample.id}`,
  ]);
  const page = {
    id: "instance",
    title: "Page",
    path: "/first",
    description: "",
    enabled: true,
    source: "registered",
    implementation_id: "core.people",
    revision: 1,
  } as const;
  assert.deepEqual(templateTargets({ page }), [
    "page:instance",
    "page:core.people",
  ]);
  assert.deepEqual(
    templateTargets({ page: { ...page, path: "/en/changed" } }),
    templateTargets({ page }),
  );
  assert.deepEqual(templateTargets({}), []);
});

test("a built-in working child inherits Argon and contributes only its local differences", () => {
  assert.deepEqual(
    themeRegistry.chain("paper").map((t) => t.id),
    ["paper", "argon"],
  );
  assert.equal(themeRegistry.owner("paper", "public.header"), "argon");
  assert.equal(themeRegistry.owner("paper", "public.hero"), "argon");
  assert.deepEqual(
    themeRegistry.templates("paper", "page", ["page:core.people"]),
    [],
  );
});

test("theme selection is explicit per configuration and environment overrides are validated", () => {
  const config = {
    BACKEND_BASE_URL: "http://127.0.0.1:8001",
    FRONTEND_NODE_ID: "test",
  };
  assert.equal(parseConfiguration(config).theme.active, "argon");
  assert.equal(
    parseConfiguration({ ...config, theme: { active: "paper" } }).theme.active,
    "paper",
  );
  assert.equal(
    parseConfiguration(
      { ...config, theme: { active: "paper" } },
      { FRONTEND_THEME: "argon" },
    ).theme.active,
    "argon",
  );
  for (const active of ["", "../paper", "https://example.com/theme"])
    assert.throws(() => parseConfiguration({ ...config, theme: { active } }));
  assert.throws(() =>
    parseConfiguration({ ...config, theme: { unknown: true } }),
  );
});
