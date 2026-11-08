import assert from "node:assert/strict";
import test from "node:test";
import type { PluginUsage, PublicSettings } from "@/core/contracts/settings";
import { queryExtensionUsage } from "@/core/contracts/settings";
import {
  changedPluginIds,
  pluginNeedsConfirmation,
} from "@/core/settings/plugin-impact";
import { RequestError } from "@/core/http/request";

const settings = (disabled: string[]): PublicSettings => ({
  site: { name: "Test", author: "Test", description: "", navigation: [] },
  theme: {},
  extensions: { theme: "argon", disabled_plugins: disabled },
});

test("activation checks only effective changes, including re-enabling and changes across settings tabs", () => {
  const saved = settings(["plugin.old", "plugin.kept"]);
  const draft = settings(["plugin.new", "plugin.kept"]);
  assert.deepEqual(changedPluginIds(saved, draft), [
    "plugin.new",
    "plugin.old",
  ]);
  draft.extensions!.disabled_plugins = [...saved.extensions!.disabled_plugins!];
  draft.site.name = "Unrelated edit";
  assert.deepEqual(changedPluginIds(saved, draft), []);
  assert.deepEqual(
    changedPluginIds(settings([]), { ...settings([]), extensions: undefined }),
    [],
  );
});

test("any applied usage or missing registration requires confirmation; an installed unused plugin does not", () => {
  const unused: PluginUsage = {
    plugin_id: "test.plugin",
    title: "Test",
    registered: true,
    applied_pages: 0,
    published_contents: 0,
    scheduled_contents: 0,
  };
  assert.equal(pluginNeedsConfirmation(unused), false);
  for (const field of [
    "applied_pages",
    "published_contents",
    "scheduled_contents",
  ] as const)
    assert.equal(pluginNeedsConfirmation({ ...unused, [field]: 1 }), true);
  assert.equal(pluginNeedsConfirmation({ ...unused, registered: false }), true);
});

test("usage preflight uses the generated private POST with CSRF and never replays failed requests", async () => {
  let attempts = 0;
  const input = { plugin_ids: ["test.plugin"] };
  await queryExtensionUsage("http://api.example.test", input, "csrf", {
    fetcher: async (url, options) => {
      attempts++;
      assert.equal(
        String(url),
        "http://api.example.test/v1/admin/extensions/usage",
      );
      assert.equal(options?.method, "POST");
      assert.equal(options?.credentials, "include");
      assert.equal(options?.cache, "no-store");
      assert.equal(new Headers(options?.headers).get("X-CSRF-Token"), "csrf");
      assert.deepEqual(JSON.parse(String(options?.body)), input);
      return Response.json({
        success: true,
        code: 200,
        msg: "ok",
        data: { scanned_at: new Date().toISOString(), plugins: [] },
      });
    },
  });
  await assert.rejects(
    queryExtensionUsage("http://api.example.test", input, "csrf", {
      fetcher: async () => {
        attempts++;
        throw new TypeError("offline");
      },
    }),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "network",
  );
  assert.equal(attempts, 2);
});
