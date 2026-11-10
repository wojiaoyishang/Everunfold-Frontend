import assert from "node:assert/strict";
import test from "node:test";
import {
  themeActivationInput,
  mergeActivatedTheme,
} from "../src/core/settings/theme-activation";
import type { PublicSettings, SettingsState } from "@/core/contracts/settings";
import {
  themeProfile,
  updateThemeProfile,
} from "@/core/settings/theme-options";

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

test("theme settings are stored and resolved per active theme", () => {
  const value: PublicSettings = {
    site: { name: "Site", author: "A", description: "" },
    theme: { accent: "#111111" },
    theme_options: {
      argon: { accent: "#111111" },
      paper: { accent: "#222222", paper_tone: "ivory" },
    },
    extensions: { theme: "paper" },
  };
  assert.equal(themeProfile(value)?.paper_tone, "ivory");
  const changed = updateThemeProfile(value, "paper", { paper_tone: "gray" });
  assert.equal(changed.theme.paper_tone, "gray");
  assert.equal(changed.theme_options?.paper?.paper_tone, "gray");
  assert.equal(changed.theme_options?.argon?.accent, "#111111");
  assert.equal(value.theme_options?.paper?.paper_tone, "ivory");
});

test("missing theme values resolve to stable runtime defaults", () => {
  const value: PublicSettings = {
    site: { name: "Site", author: "A", description: "" },
    theme: {},
    extensions: { theme: "argon" },
  };
  const profile = themeProfile(value);
  assert.equal(profile?.article.related_count, 6);
  assert.equal(profile?.feed.default_type, "all");
  assert.equal(profile?.code.line_numbers, true);
  assert.equal(profile?.paper_tone, "ivory");
});
