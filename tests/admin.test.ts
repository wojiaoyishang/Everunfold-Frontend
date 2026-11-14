import assert from "node:assert/strict";
import test from "node:test";
import {
  adminDestination,
  adminNavigation,
  adminNavigationGroups,
} from "../src/core/admin/navigation";
import {
  adminPreferencesKey,
  parseAdminPreferences,
} from "../src/core/admin/preferences";
import {
  adminSidebarScrollKey,
  parseAdminSidebarScroll,
} from "../src/core/admin/sidebar-scroll";
import { pluginMatchesSearch } from "../src/core/plugins/search";
import {
  isManagementRoute,
  loginDestination,
  loginReturnPath,
} from "../src/core/auth/routes";

test("registered admin destinations bypass public snapshots and survive a safe login return", () => {
  for (const item of adminNavigation) {
    assert.equal(isManagementRoute(item.href), true);
    assert.equal(isManagementRoute(`${item.href}/`), true);
    assert.equal(adminDestination(`${item.href}/`)?.id, item.id);
    const target = `${item.href}?view=all#main`;
    assert.equal(loginDestination(target, true), target);
    assert.equal(loginDestination(target, false), "/");
  }
  for (const path of [
    "/admin/content/article/new",
    "/admin/content/shuoshuo/00000000-0000-0000-0000-000000000001/edit",
    "/admin/content/article/00000000-0000-0000-0000-000000000001/versions",
    "/admin/content/shuoshuo/00000000-0000-0000-0000-000000000001/versions",
    "/admin/pages/00000000-0000-0000-0000-000000000001/versions",
    "/admin/pages/templates/00000000-0000-0000-0000-000000000001/versions",
  ]) {
    assert.equal(isManagementRoute(path), true);
    assert.equal(loginReturnPath(path), path);
  }
  for (const path of [
    "/admin/content/future",
    "/admin/content/article/unknown/edit",
    "/admin/content/article/new/unknown",
    "/admin/content.html",
    "/admin/settings/cache",
    "/administer",
    "/admin/%2f%2fevil.example",
    "/admin/media/../../login",
    "/admin/media\\evil.example",
  ])
    assert.equal(loginReturnPath(path), "/");
});

test("admin navigation separates primary content, tools, appearance and system settings", () => {
  const icons = adminNavigation
    .filter((item) => item.menu)
    .map((item) => item.icon);
  assert.equal(new Set(icons).size, icons.length);
  assert.deepEqual(
    adminNavigationGroups.map((group) => group.label),
    [
      "概览",
      "内容",
      "内容工具",
      "资源",
      "外观",
      "成员与互动",
      "通知与消息",
      "设置",
    ],
  );
  const ids = (label: string) =>
    adminNavigationGroups
      .find((group) => group.label === label)
      ?.items.map((item) => item.id);
  assert.deepEqual(ids("内容工具"), ["content.glossary", "core.shortcodes"]);
  assert.deepEqual(ids("外观"), [
    "core.settings.theme",
    "core.settings.navigation",
    "core.settings.translations",
  ]);
  assert.deepEqual(ids("成员与互动"), [
    "core.comments",
    "core.settings.discussion",
    "core.users",
    "core.access",
  ]);
  assert.deepEqual(ids("通知与消息"), [
    "core.notifications.policy",
    "core.notifications.templates",
    "core.notifications.platforms",
    "core.notifications.deliveries",
  ]);
  const platform = adminNavigation.find(
    (item) => item.id === "core.notifications.platforms",
  );
  assert.equal(platform?.icon, "notification-platform");
  assert.equal(
    adminNavigation.filter(
      (item) => item.menu && item.icon === "notification-platform",
    ).length,
    1,
  );
  assert.deepEqual(
    adminNavigationGroups
      .find((group) => group.label === "设置")
      ?.branches.map((branch) => branch.label),
    [],
  );
  assert.deepEqual(ids("设置"), [
    "core.settings.plugins",
    "core.settings.site",
    "core.settings.system",
    "core.settings.runtime",
    "core.settings.api-keys",
    "core.settings.nodes",
  ]);
  assert.equal(
    adminDestination("/admin/settings/maintenance")?.href,
    "/admin/settings/nodes",
  );
  assert.equal(
    adminDestination("/admin/settings/nodes")?.label,
    "节点状态与维护",
  );
  const settingsIcons =
    adminNavigationGroups
      .find((group) => group.label === "设置")
      ?.items.map((item) => item.icon) ?? [];
  assert.equal(new Set(settingsIcons).size, settingsIcons.length);
  assert.equal(
    adminNavigation.some((item) => item.id === "core.settings.captcha"),
    false,
  );
  assert.equal(
    adminNavigationGroups
      .flatMap((group) => group.items)
      .some((item) => item.id === "core.settings.captcha"),
    false,
  );
});

test("corrupt or outdated admin appearance cannot import permissions or public reader settings", () => {
  const fallback = {
    mode: "system",
    density: "comfortable",
    motion: "full",
    sidebarCollapsed: false,
  };
  for (const value of [
    null,
    "invalid JSON",
    "null",
    "123",
    "[]",
    '{"mode":"sunset","density":"tiny","sidebarCollapsed":"true"}',
  ])
    assert.deepEqual(parseAdminPreferences(value), fallback);
  assert.deepEqual(
    parseAdminPreferences(
      JSON.stringify({
        mode: "dark",
        density: "compact",
        sidebarCollapsed: true,
        token: "not-stored",
        role: "admin",
        accent: "red",
        fontSize: 30,
      }),
    ),
    {
      mode: "dark",
      density: "compact",
      motion: "full",
      sidebarCollapsed: true,
    },
  );
});

test("admin preferences are isolated by site and account with a separate versioned namespace", () => {
  const key = adminPreferencesKey("https://api.example/", "account:1");
  assert.equal(key, adminPreferencesKey("https://api.example", "account:1"));
  assert.notEqual(
    key,
    adminPreferencesKey("https://other.example", "account:1"),
  );
  assert.notEqual(key, adminPreferencesKey("https://api.example", "account:2"));
  assert.ok(key.startsWith("everunfold.admin.appearance.v1:"));
});

test("admin motion preference persists independently and migrates older appearance values", () => {
  for (const motion of ["full", "system", "reduced"])
    assert.equal(
      parseAdminPreferences(JSON.stringify({ motion })).motion,
      motion,
    );
  assert.equal(
    parseAdminPreferences('{"mode":"dark","motion":"invalid"}').motion,
    "full",
  );
  assert.equal(parseAdminPreferences('{"mode":"dark"}').motion, "full");
});

test("sidebar scroll memory is scoped by account and canonical admin path", () => {
  assert.equal(
    adminSidebarScrollKey("account:1", "/admin/settings/system/"),
    adminSidebarScrollKey("account:1", "/admin/settings/system"),
  );
  assert.notEqual(
    adminSidebarScrollKey("account:1", "/admin/settings/system"),
    adminSidebarScrollKey("account:2", "/admin/settings/system"),
  );
  assert.notEqual(
    adminSidebarScrollKey("account:1", "/admin/settings/system"),
    adminSidebarScrollKey("account:1", "/admin/settings/runtime"),
  );
  assert.equal(parseAdminSidebarScroll("184.9"), 184);
  for (const value of [null, "", "-1", "NaN", "Infinity"])
    assert.equal(parseAdminSidebarScroll(value), null);
});

test("plugin settings search covers identity, metadata and contributed capabilities", () => {
  const plugin = {
    id: "everunfold.glossary",
    title: "术语表与悬浮提示",
    description: "维护术语与正文提示",
    version: "1.7.0",
    author: "Everunfold",
    page_ids: ["glossary"],
    shortcodes: ["glossary:term"],
    components: ["GlossaryCard"],
    captcha_providers: [{}],
  };
  for (const query of [
    "",
    "术语",
    "1.7",
    "everunfold",
    "GLOSSARY",
    "glossary:term",
    "验证码",
  ])
    assert.equal(pluginMatchesSearch(query, plugin), true, query);
  assert.equal(pluginMatchesSearch("不存在的插件", plugin), false);
});
