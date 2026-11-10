import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdminRegistry,
  adminMenuEntries,
  type AdminModuleRegistration,
} from "../src/core/admin/registry";
import { builtinAdminModule } from "../src/core/admin/builtin-module";

const extension: AdminModuleRegistration = {
  id: "example",
  groups: [{ id: "example.tools", label: "扩展", order: 30 }],
  pages: [
    {
      id: "example.settings",
      href: "/admin/example",
      label: "扩展设置",
      description: "",
      icon: "extension",
      menu: { group: "example.tools", order: 10 },
    },
    {
      id: "example.detail",
      href: "/admin/example/detail",
      label: "扩展详情",
      description: "",
      icon: "extension",
      menu: null,
    },
    {
      id: "example.quick",
      href: "/admin/example/quick",
      label: "快捷入口",
      description: "",
      icon: "extension",
      menu: { group: "core.workspace", order: 25 },
    },
  ],
};

test("admin modules compose deterministic groups and entries independently of registration order", () => {
  const first = createAdminRegistry([builtinAdminModule, extension]);
  const reversed = createAdminRegistry([extension, builtinAdminModule]);
  assert.deepEqual(first.navigation, reversed.navigation);
  assert.deepEqual(
    first.navigation.map((g) => g.id),
    [
      "core.workspace",
      "core.tools",
      "example.tools",
      "core.resources",
      "core.appearance",
      "core.people",
      "core.settings",
    ],
  );
  assert.deepEqual(
    first.navigation[0].items.map((p) => p.id),
    ["core.overview", "example.quick"],
  );
  assert.equal(first.resolve("/admin/example/detail/")?.id, "example.detail");
  assert.equal(first.page("example.detail")?.menu, null);
  assert.equal(
    first.navigation.some((g) =>
      g.items.some((p) => p.id === "example.detail"),
    ),
    false,
  );
  assert.equal(first.resolve("/admin/unregistered"), undefined);
  assert.equal(first.resolve("https://evil.example/admin"), undefined);
  assert.equal(first.resolve("/admin/content?view=all"), undefined);
});

test("admin registration rejects collisions, missing groups and non-canonical routes", () => {
  assert.throws(
    () => createAdminRegistry([builtinAdminModule, builtinAdminModule]),
    /duplicate admin module/,
  );
  const page = extension.pages[0];
  const register = (patch: Partial<typeof page>) =>
    createAdminRegistry([
      builtinAdminModule,
      { ...extension, pages: [{ ...page, ...patch }] },
    ]);
  assert.throws(() => register({ id: "core.override" }), /namespace/);
  assert.throws(
    () => register({ href: "/admin/content" }),
    /Duplicate admin page or route/,
  );
  assert.throws(
    () => createAdminRegistry([{ ...extension, pages: [page, page] }]),
    /Duplicate admin page/,
  );
  assert.throws(
    () => register({ menu: { group: "missing.group", order: 1 } }),
    /Unknown admin menu group/,
  );
  assert.throws(
    () => register({ menu: { group: "core.workspace", order: NaN } }),
    /menu order/,
  );
  for (const href of [
    "//evil.example",
    "https://evil.example",
    "/admin/example/",
    "/admin/../login",
    "/admin/%2f%2fexample",
    "/admin/example#part",
    "/admin/example?x=1",
    "/administrator",
  ])
    assert.throws(() => register({ href }), /Invalid admin destination/);
});

test("compiled admin metadata is immutable and omits empty groups", () => {
  const input: AdminModuleRegistration = {
    id: "test",
    groups: [{ id: "test.empty", label: "空组", order: 1 }],
    pages: [],
  };
  const registry = createAdminRegistry([builtinAdminModule, input]);
  assert.equal(
    registry.navigation.some((group) => group.id === "test.empty"),
    false,
  );
  assert.ok(Object.isFrozen(registry));
  assert.ok(Object.isFrozen(registry.pages));
  assert.ok(Object.isFrozen(registry.navigation));
  assert.ok(Object.isFrozen(registry.page("core.content")));
  assert.ok(Object.isFrozen(registry.page("core.content")?.menu));
  assert.throws(
    () => Object.assign(registry.page("core.content")!, { href: "/unsafe" }),
    TypeError,
  );
  assert.equal(registry.resolve("/admin/content")?.id, "core.content");
});

test("submenu filtering cannot expose hidden destinations or leave an empty branch", () => {
  const registry = createAdminRegistry([builtinAdminModule]);
  const group = registry.navigation.find((g) => g.id === "core.settings")!;
  const entries = adminMenuEntries(
    group,
    (page) => page.id === "core.settings.runtime",
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, "branch");
  if (entries[0].kind !== "branch") throw new Error("missing branch");
  assert.equal(entries[0].branch.id, "core.system");
  assert.deepEqual(
    entries[0].items.map((p) => p.id),
    ["core.settings.runtime"],
  );
  assert.deepEqual(
    adminMenuEntries(group, () => false),
    [],
  );
  assert.equal(
    registry.resolve("/admin/settings/runtime")?.id,
    "core.settings.runtime",
  );
  assert.equal(registry.resolve("/admin/system"), undefined);
});

test("submenu registration rejects unknown branches and cross-group placement", () => {
  for (const branch of ["core.missing", "core.system"]) {
    assert.throws(
      () =>
        createAdminRegistry([
          builtinAdminModule,
          {
            ...extension,
            pages: [
              {
                ...extension.pages[0],
                menu: { group: "example.tools", order: 1, branch },
              },
            ],
          },
        ]),
      /Unknown or misplaced admin branch/,
    );
  }
});
