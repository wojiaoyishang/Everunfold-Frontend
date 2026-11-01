import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  loginReturnPath,
  loginDestination,
  isManagementLink,
  isManagementRoute,
} from "../src/core/auth/routes";
import { authFailureMessage, checkedSession } from "../src/core/auth/session";
import { clientNavigationHref } from "../src/core/navigation/targets";
import { RequestError } from "../src/core/http/request";
import {
  login,
  logout,
  readAuthSession,
  readAdminSession,
} from "../src/generated/auth-client";
import type { AuthSessionState } from "../src/generated/auth-contract";
import { PasswordField } from "../src/themes/argon/components/ui/password-field";

const user = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "tester",
  display_name: "测试管理员",
  role: "admin" as const,
};
const guest: AuthSessionState = {
  authenticated: false,
  user: null,
  csrf_token: "csrf-from-server",
  expires_at: "2026-11-01T00:00:00Z",
};
const member: AuthSessionState = { ...guest, authenticated: true, user };
const ok = (data: AuthSessionState) =>
  Response.json({ success: true, code: 200, msg: "ok", data });

test("management destinations bypass the public navigation pipeline and restrict login return targets", () => {
  for (const href of [
    "/login",
    "/login?next=%2Fadmin",
    "/admin",
    "/admin/future",
  ]) {
    assert.equal(clientNavigationHref("http://example.test/", href), null);
    assert.equal(isManagementLink(href), true);
  }
  assert.equal(isManagementRoute("/admin/"), true);
  assert.equal(isManagementRoute("/administer"), false);
  assert.equal(isManagementRoute("/login.html"), false);
  assert.equal(isManagementRoute("/admin/not-implemented"), false);
  assert.equal(loginReturnPath("/admin?tab=home"), "/admin?tab=home");
  for (const input of [
    undefined,
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "/admin/../login",
    "/%2f%2fevil.example",
    "javascript:alert(1)",
    "/admin\n",
    "/private",
  ]) {
    assert.equal(loginReturnPath(input), "/");
  }
});

test("general account login returns readers home and preserves an explicit admin entry", () => {
  assert.equal(loginReturnPath(undefined), "/");
  assert.equal(
    loginReturnPath("/?type=article#main-content"),
    "/?type=article#main-content",
  );
  for (const isAdmin of [false, true]) {
    assert.equal(loginDestination("/", isAdmin), "/");
    assert.equal(loginDestination("https://evil.example/", isAdmin), "/");
  }
  assert.equal(loginDestination("/admin", false), "/");
  assert.equal(loginDestination("/admin?tab=home", true), "/admin?tab=home");
  assert.equal(loginReturnPath("/login"), "/");
});

test("generated session reads are credentialed, uncached, validated and do not send CSRF in a URL", async () => {
  for (const [read, route, data] of [
    [readAuthSession, "/v1/auth/session", guest],
    [readAdminSession, "/v1/admin/session", member],
  ] as const) {
    const response = await read("http://example.test", {
      fetcher: async (input, options) => {
        assert.equal(String(input), `http://example.test${route}`);
        assert.equal(options?.method, "GET");
        assert.equal(options?.credentials, "include");
        assert.equal(options?.cache, "no-store");
        assert.equal(options?.body, undefined);
        return ok(data);
      },
    });
    assert.deepEqual(response.data, data);
  }
  await assert.rejects(
    readAuthSession("http://example.test", {
      fetcher: async () =>
        ok({
          ...guest,
          user: { ...user, role: "owner" },
        } as unknown as AuthSessionState),
    }),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "invalid",
  );
});

test("login and logout use POST, bind the server CSRF header and accept rotated session data", async () => {
  const result = await login(
    "http://example.test",
    { username: "tester", password: "test-input" },
    guest.csrf_token,
    {
      fetcher: async (input, options) => {
        assert.equal(String(input), "http://example.test/v1/auth/login");
        assert.equal(options?.method, "POST");
        assert.equal(options?.credentials, "include");
        assert.equal(options?.cache, "no-store");
        assert.equal(
          new Headers(options?.headers).get("X-CSRF-Token"),
          guest.csrf_token,
        );
        assert.deepEqual(JSON.parse(String(options?.body)), {
          username: "tester",
          password: "test-input",
        });
        return ok({ ...member, csrf_token: "rotated-csrf" });
      },
    },
  );
  assert.equal(result.data.csrf_token, "rotated-csrf");
  await logout("http://example.test", result.data.csrf_token, {
    fetcher: async (_input, options) => {
      assert.equal(options?.method, "POST");
      assert.equal(options?.body, undefined);
      assert.equal(
        new Headers(options?.headers).get("X-CSRF-Token"),
        "rotated-csrf",
      );
      return ok(guest);
    },
  });
});

test("credential rejection and uncertain writes stay failures with no automatic retry", async () => {
  let attempts = 0;
  await assert.rejects(
    login(
      "http://example.test",
      { username: "tester", password: "wrong" },
      guest.csrf_token,
      {
        fetcher: async () => {
          attempts++;
          return Response.json(
            { success: false, code: 40110, msg: "ignored" },
            { status: 401 },
          );
        },
      },
    ),
    (error: unknown) => error instanceof RequestError && error.status === 401,
  );
  assert.equal(attempts, 1);
  await assert.rejects(
    logout("http://example.test", guest.csrf_token, {
      timeoutMs: 10,
      fetcher: async () => new Response(new ReadableStream()),
    }),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "timeout",
  );
  assert.match(
    authFailureMessage(new RequestError("http", 401), "login"),
    /用户名或密码/,
  );
  assert.match(
    authFailureMessage(new RequestError("timeout"), "logout"),
    /重新检查/,
  );
  assert.match(
    authFailureMessage(new RequestError("network"), "session"),
    /无法连接/,
  );
  assert.match(
    authFailureMessage(new RequestError("invalid"), "session"),
    /无法识别/,
  );
  assert.match(
    authFailureMessage(new RequestError("http", 503), "login"),
    /暂时不可用/,
  );
});

test("the shared password field keeps native form semantics and names its visibility control", () => {
  const html = renderToStaticMarkup(
    createElement(PasswordField, {
      id: "login-password",
      name: "password",
      autoComplete: "current-password",
      "aria-describedby": "login-error",
    }),
  );
  assert.match(html, /type="password"/);
  assert.match(html, /aria-describedby="login-error"/);
  assert.match(html, /type="button"/);
  assert.match(html, /aria-label="显示密码"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /aria-controls="login-password"/);
});

test("an inconsistent or unprivileged session cannot become an administrator view", () => {
  assert.deepEqual(checkedSession(guest), guest);
  assert.deepEqual(checkedSession(member, true), member);
  for (const data of [
    { ...guest, user },
    { ...member, user: null },
    { ...guest, csrf_token: "" },
  ]) {
    assert.throws(
      () => checkedSession(data),
      (error: unknown) =>
        error instanceof RequestError && error.kind === "invalid",
    );
  }
  assert.throws(
    () => checkedSession(guest, true),
    (error: unknown) => error instanceof RequestError && error.status === 401,
  );
  assert.throws(
    () => checkedSession({ ...member, user: { ...user, role: "user" } }, true),
    (error: unknown) => error instanceof RequestError && error.status === 403,
  );
});
