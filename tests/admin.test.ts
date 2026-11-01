import assert from "node:assert/strict";
import test from "node:test";
import {
  adminDestination,
  adminNavigation,
} from "../src/core/admin/navigation";
import {
  adminPreferencesKey,
  parseAdminPreferences,
} from "../src/core/admin/preferences";
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
    "/admin/content/future",
    "/admin/content.html",
    "/administer",
    "/admin/%2f%2fevil.example",
    "/admin/media/../../login",
    "/admin/media\\evil.example",
  ])
    assert.equal(loginReturnPath(path), "/");
});

test("corrupt or outdated admin appearance cannot import permissions or public reader settings", () => {
  const fallback = {
    mode: "system",
    density: "comfortable",
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
    { mode: "dark", density: "compact", sidebarCollapsed: true },
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
