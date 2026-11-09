import assert from "node:assert/strict";
import test from "node:test";
import { themeMetadata } from "../src/core/extensions/theme-metadata";
import { collectThemes } from "../src/core/extensions/component-descriptors";
import type { ThemeDefinition } from "../src/core/extensions/types";

test("theme deployment metadata preserves authors and artwork without exporting component internals", () => {
  const source: ThemeDefinition = {
    id: "paper",
    version: "2.0.0",
    parent: "argon",
    title: "Paper",
    description: "A child theme",
    preview: "/reference/themes/paper.svg",
    author: { name: "A developer", url: "https://example.test/author" },
    homepage: "https://example.test/theme",
    repository: "https://example.test/source",
    license: "Custom license",
    components: ["private.view"],
    templates: { article: "private.view" },
    styles: true,
  };
  const snapshot = structuredClone(source);
  const exported = themeMetadata(source);
  assert.deepEqual(exported.author, source.author);
  assert.equal(exported.preview, "/reference/themes/paper.svg");
  assert.equal(exported.license, "Custom license");
  assert.equal("components" in exported, false);
  assert.equal("templates" in exported, false);
  assert.equal("styles" in exported, false);
  assert.deepEqual(source, snapshot);
});

test("legacy theme declarations retain automatic discovery and parent defaults with optional metadata", () => {
  const registry = collectThemes([
    { id: "argon", version: "1.0.0", parent: null },
    { id: "custom", version: "1.0.0" },
  ]);
  const result = themeMetadata(registry.get("custom")!);
  assert.equal(result.title, "custom");
  assert.equal(result.parent, "argon");
  assert.equal(result.preview, "");
  assert.equal(result.author, null);
});

test("theme discovery rejects unsafe artwork, links and malformed metadata before registration", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:image/svg+xml,x",
    "//example.test/a",
    "https://name:secret@example.test/a",
    "/\\bad",
    "/bad\nimage",
  ]) {
    for (const field of ["preview", "repository", "homepage"])
      assert.throws(
        () => collectThemes([{ id: "argon", version: "1.0.0", [field]: url }]),
        /Invalid theme metadata/,
      );
    assert.throws(
      () =>
        collectThemes([
          { id: "argon", version: "1.0.0", author: { name: "A", url } },
        ]),
      /Invalid theme metadata/,
    );
  }
  for (const patch of [
    { title: " " },
    { author: { name: " " } },
    { description: "x".repeat(501) },
    { license: "x".repeat(101) },
  ])
    assert.throws(
      () => collectThemes([{ id: "argon", version: "1.0.0", ...patch }]),
      /Invalid theme metadata/,
    );
});
