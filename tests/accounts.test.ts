import assert from "node:assert/strict";
import test from "node:test";
import {
  adminRoutePermission,
  can,
  canAccessAdmin,
} from "../src/core/accounts/permissions";
import {
  isManagementRoute,
  loginDestination,
  loginReturnPath,
} from "../src/core/auth/routes";
import { clientNavigationHref } from "../src/core/navigation/targets";
import type { AuthUser } from "@/core/contracts/auth";
import { checkedSession } from "../src/core/auth/session";

const user: AuthUser = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "author",
  display_name: "Author",
  role: "user",
  permissions: { "content:read": "all", "content:write": "own" },
};

test("private account and user-management destinations have explicit safe login returns", () => {
  for (const path of [
    "/account",
    "/admin/users",
    "/admin/users/new",
    "/admin/users/presets",
    `/admin/users/${user.id}`,
    "/admin/settings/api-keys",
  ]) {
    assert.ok(isManagementRoute(path));
    assert.equal(loginReturnPath(path), path);
    assert.equal(clientNavigationHref("http://example.test/", path), null);
  }
  for (const path of [
    "/account/private",
    "/en/account",
    "/admin/users/not-a-uuid",
    "//evil.test/account",
  ])
    assert.equal(loginReturnPath(path), "/");
  assert.equal(loginDestination("/admin", true, true), "/account");
});

test("scoped editor capabilities neither imply media access nor authorize other owners", () => {
  assert.ok(canAccessAdmin(user));
  assert.ok(can(user, "content:read"));
  assert.ok(can(user, "content:write", user.id));
  assert.ok(!can(user, "content:write", null));
  assert.ok(!can(user, "content:write", "other"));
  assert.ok(!can(user, "media:read"));
  assert.equal(
    adminRoutePermission("/admin/settings/api-keys"),
    "applications:manage",
  );
  assert.equal(adminRoutePermission("/admin/users/new"), "users:manage");
  assert.ok(!can({ ...user, role: "admin" }, "unregistered"));
});

test("initial-password accounts and ordinary readers cannot enter administration", () => {
  assert.ok(!canAccessAdmin({ ...user, must_change_password: true }));
  assert.ok(!canAccessAdmin({ ...user, permissions: {} }));
  assert.throws(() =>
    checkedSession(
      {
        authenticated: true,
        user: { ...user, must_change_password: true },
        csrf_token: "csrf",
        expires_at: "2099-01-01T00:00:00Z",
      },
      true,
    ),
  );
  assert.equal(
    checkedSession(
      {
        authenticated: true,
        user,
        csrf_token: "csrf",
        expires_at: "2099-01-01T00:00:00Z",
      },
      true,
    ).user?.id,
    user.id,
  );
});
