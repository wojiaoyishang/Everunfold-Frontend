import assert from "node:assert/strict";
import test from "node:test";
import { createAdminPluginRegistry } from "../src/core/admin/navigation";
import { adminMenuEntries } from "../src/core/admin/registry";
import { can } from "../src/core/accounts/permissions";
import { isManagementRoute, loginReturnPath } from "../src/core/auth/routes";
import { pluginAdminRoute } from "../src/core/plugins/admin-routes";
import { createPluginRegistry } from "../src/core/plugins/create-registry";
import type { FrontendPlugin } from "../src/core/plugins/types";
import type { AuthUser } from "../src/core/contracts/auth";

const definition = {
  id: "settings",
  label: "Plugin settings",
  component: "fixture.admin.panel",
  permission: "settings:write",
};

const fixture = (setup: FrontendPlugin["setup"]): FrontendPlugin => ({
  id: "fixture.admin",
  version: "1.0.0",
  surface: "admin",
  setup,
});

test("plugin administration uses the private workspace on direct navigation", () => {
  const path = "/admin/plugins/fixture.admin/settings";
  assert.deepEqual(pluginAdminRoute(path), {
    pluginId: "fixture.admin",
    pageId: "settings",
  });
  assert.ok(isManagementRoute(path));
  assert.equal(loginReturnPath(path), path);
  for (const invalid of [
    "/admin/plugins/fixture.admin",
    "/admin/plugins/fixture.admin/settings/unknown",
    "/admin/plugins/fixture.admin/%73ettings",
  ]) {
    assert.equal(pluginAdminRoute(invalid), undefined);
    assert.equal(isManagementRoute(invalid), false);
    assert.equal(loginReturnPath(invalid), "/");
  }
});

test("registered plugin pages extend built-in groups or create their own sections and branches", () => {
  const registry = createPluginRegistry([
    fixture(({ adminPages, components }) => {
      components.register(definition.component);
      adminPages.registerGroup({ id: "tools", label: "Extra tools" });
      adminPages.registerGroup({
        id: "advanced",
        label: "Advanced",
        parent: "core.tools",
      });
      adminPages.register({
        ...definition,
        menu: { group: "core.settings", order: 25 },
      });
      adminPages.register({
        ...definition,
        id: "drafts",
        menu: { group: "tools" },
      });
      adminPages.register({
        ...definition,
        id: "advanced-page",
        menu: { group: "advanced" },
      });
      adminPages.register({ ...definition, id: "hidden", menu: false });
    }),
  ]);
  const navigation = createAdminPluginRegistry(
    registry.adminPages,
    registry.adminMenuGroups,
  );
  const route = "/admin/plugins/fixture.admin/";
  const settings = navigation.navigation.find(
    (group) => group.id === "core.settings",
  );
  assert.ok(settings?.items.some((page) => page.href === route + "settings"));
  const own = navigation.navigation.find(
    (group) => group.label === "Extra tools",
  );
  assert.deepEqual(
    own?.items.map((page) => page.href),
    [route + "drafts"],
  );
  const advanced = navigation.navigation.find(
    (group) => group.id === "core.tools",
  );
  assert.ok(advanced);
  assert.ok(
    adminMenuEntries(advanced, () => true).some(
      (entry) =>
        entry.kind === "branch" &&
        entry.items[0]?.href === route + "advanced-page",
    ),
  );
  assert.ok(
    !adminMenuEntries(advanced, (item) => !item.href.startsWith(route)).some(
      (entry) => entry.kind === "branch",
    ),
  );
  assert.equal(navigation.resolve(route + "hidden")?.menu, null);
  assert.deepEqual(
    createAdminPluginRegistry([], [])
      .navigation.flatMap((group) => group.items)
      .filter((page) => page.href.startsWith(route)),
    [],
  );
});

test("page contributions require the admin surface, local renderer and permissions", () => {
  const add = ({
    adminPages,
    components,
  }: Parameters<FrontendPlugin["setup"]>[0]) => {
    components.register(definition.component);
    adminPages.register(definition);
  };
  const publicPlugin: FrontendPlugin = { ...fixture(add), surface: undefined };
  assert.throws(() => createPluginRegistry([publicPlugin]), /admin navigation/);
  assert.throws(
    () =>
      createPluginRegistry([
        fixture(({ adminPages }) => adminPages.register(definition)),
      ]),
    /renderer must be registered/,
  );
  assert.throws(
    () =>
      createPluginRegistry([
        fixture(({ adminPages, components }) => {
          components.register(definition.component);
          adminPages.register({ ...definition, menu: { group: "unknown" } });
        }),
      ]),
    /Unknown admin page group/,
  );
  const [page] = createPluginRegistry([fixture(add)]).adminPages;
  const user: AuthUser = {
    id: "member",
    username: "member",
    display_name: "Member",
    role: "user",
    permissions: { "settings:read": "all" },
  };
  assert.ok(!can(user, page.permission, null));
  assert.ok(
    can(
      { ...user, permissions: { [page.permission]: "all" } },
      page.permission,
      null,
    ),
  );
});
