import assert from "node:assert/strict";
import test from "node:test";
import {
  readSettings,
  saveSettings,
  saveCachePolicy,
  retrySettingsSync,
} from "../src/generated/settings-client";
import type { PublicSettings } from "../src/generated/settings-contract";
import { RequestError } from "../src/core/http/request";
import { siteNavigation } from "../src/themes/argon/navigation";
import { snapshot } from "./fixtures";
const value: PublicSettings = {
  site: {
    name: "Campfire",
    description: "Test",
    author: "Tester",
    navigation: [],
  },
  theme: {},
};
const state = {
  source_epoch: "00000000-0000-0000-0000-000000000001",
  revision: 2,
  value,
  delivery: [],
};
const ok = (data: object) =>
  Response.json({ success: true, code: 200, msg: "ok", data });

test("settings reads and writes use generated direct API paths, private transport and revision guards", async () => {
  const base = "http://api.example.test";
  await readSettings(base, {
    fetcher: async (url, options) => {
      assert.equal(String(url), `${base}/v1/admin/settings`);
      assert.equal(options?.credentials, "include");
      assert.equal(options?.cache, "no-store");
      return ok(state);
    },
  });
  const input = { expected_revision: 1, value };
  const saved = await saveSettings(base, input, "csrf", {
    fetcher: async (url, options) => {
      assert.equal(String(url), `${base}/v1/admin/settings`);
      assert.equal(options?.method, "PATCH");
      assert.equal(options?.credentials, "include");
      assert.equal(options?.cache, "no-store");
      assert.equal(new Headers(options?.headers).get("X-CSRF-Token"), "csrf");
      assert.deepEqual(JSON.parse(String(options?.body)), input);
      return ok(state);
    },
  });
  assert.equal(saved.data.revision, 2);
});

test("configuration conflicts and offline writes are surfaced once without replay", async () => {
  let requests = 0;
  await assert.rejects(
    saveCachePolicy(
      "http://api.example.test",
      "web-main",
      { expected_revision: 1, value: { request_timeout_seconds: 3 } },
      "csrf",
      {
        fetcher: async (url, options) => {
          requests++;
          assert.equal(
            String(url),
            "http://api.example.test/v1/admin/frontend-nodes/web-main/cache-policy",
          );
          assert.equal(options?.method, "PATCH");
          return Response.json(
            { success: false, code: 40920, msg: "conflict", data: null },
            { status: 409 },
          );
        },
      },
    ),
    (error: unknown) => error instanceof RequestError && error.status === 409,
  );
  assert.equal(requests, 1);
  await assert.rejects(
    retrySettingsSync("http://api.example.test", "web-main", "csrf", {
      fetcher: async (_url, options) => {
        requests++;
        assert.equal(options?.method, "POST");
        throw new TypeError("offline");
      },
    }),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "network",
  );
  assert.equal(requests, 2);
});

test("an explicit empty published menu never falls back to theme reference entries", () => {
  const site = { ...snapshot().site, settings: value };
  assert.deepEqual(siteNavigation(site), []);
  site.settings = {
    ...value,
    site: {
      ...value.site,
      navigation: [
        {
          id: "archive",
          label: "归档",
          href: "/archives",
          icon: "archive",
          children: [],
        },
      ],
    },
  };
  assert.deepEqual(
    siteNavigation(site).map((item) => item.label),
    ["归档"],
  );
  assert.equal(siteNavigation(site)[0].children?.length ?? 0, 0);
});
