import assert from "node:assert/strict";
import test from "node:test";
import type {
  InstalledPlugin,
  NodeExtensionInventory,
} from "../src/core/contracts/settings";
import {
  planRecommendedActivation,
  themePluginRecommendations,
} from "../src/core/plugins/recommendations";

test("recommendations follow the active theme and its nearest declared list", () => {
  const themes = [
    { id: "argon", title: "Argon", recommended_plugins: ["core.book"] },
    { id: "paper", title: "Paper", parent: "argon" },
    {
      id: "mono",
      title: "Mono",
      parent: "paper",
      recommended_plugins: ["core.gallery"],
    },
    { id: "blank", title: "Blank", parent: "mono", recommended_plugins: [] },
  ];
  assert.deepEqual(themePluginRecommendations(themes, "paper"), ["core.book"]);
  assert.deepEqual(themePluginRecommendations(themes, "mono"), [
    "core.gallery",
  ]);
  assert.deepEqual(themePluginRecommendations(themes, "blank"), []);
  assert.deepEqual(themePluginRecommendations(themes, "missing"), []);
});

test("bulk activation targets recommendations and their required plugins", () => {
  const book = { id: "core.book", title: "Book", build: "a".repeat(64) };
  const backendPlugins = [
    {
      id: "core.glossary",
      title: "Glossary",
      version: "1.0.0",
      build: "c".repeat(64),
      requires: ["core.base"],
    },
    { id: "core.base", title: "Base", version: "1.0.0", build: "d".repeat(64) },
  ];
  const node = (
    node_id: string,
    plugins: InstalledPlugin[],
  ): NodeExtensionInventory => ({
    node_id,
    enabled: true,
    reported_at: null,
    inventory: { themes: [], plugins, pages: { pages: [] } },
  });
  const deployed = {
    plugins: [book],
    nodes: [node("one", [book]), node("two", [book])],
    backendPlugins,
    backendInSync: true,
  };
  const recommended = [book.id, "core.glossary"];
  assert.deepEqual(planRecommendedActivation(deployed, recommended), {
    required: new Set([book.id, "core.glossary", "core.base"]),
    unavailable: [],
  });
  assert.deepEqual(
    planRecommendedActivation(
      {
        ...deployed,
        backendInSync: false,
        nodes: [
          node("one", [book]),
          node("two", [{ ...book, build: "b".repeat(64) }]),
        ],
      },
      [...recommended, "core.missing"],
    ).unavailable,
    [book.id, "core.glossary", "core.missing", "core.base"],
  );
});
