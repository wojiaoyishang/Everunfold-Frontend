import assert from "node:assert/strict";
import test from "node:test";
import {
  themeActivationInput,
  mergeActivatedTheme,
} from "../src/core/settings/theme-activation";
import type { PublicSettings, SettingsState } from "@/core/contracts/settings";

test("theme activation uses the saved revision and never publishes unrelated draft settings", () => {
  const value: PublicSettings = {
    site: { name: "Saved", author: "A", description: "", navigation: [] },
    theme: {},
    extensions: { theme: "", disabled_plugins: [] },
  };
  const saved = { revision: 7, value } as SettingsState;
  const input = themeActivationInput(saved, "paper");
  assert.equal(input.expected_revision, 7);
  assert.equal(input.value.extensions?.theme, "paper");
  assert.equal(input.value.site.name, "Saved");
  assert.equal(saved.value.extensions?.theme, "");
  const draft = structuredClone(value);
  draft.site.name = "Unsaved name";
  draft.extensions!.disabled_plugins = ["core.people"];
  draft.theme.hero_title = "Unsaved title";
  const merged = mergeActivatedTheme(draft, input.value);
  assert.equal(merged.extensions?.theme, "paper");
  assert.equal(merged.site.name, "Unsaved name");
  assert.deepEqual(merged.extensions?.disabled_plugins, ["core.people"]);
  assert.equal(merged.theme.hero_title, "Unsaved title");
  assert.equal(draft.extensions?.theme, "");
});
