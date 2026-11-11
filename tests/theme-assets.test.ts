import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { argonAssetUrl, argonAssets } from "../src/themes/argon/assets";
import argon from "../src/themes/argon/theme";
import paper from "../src/themes/paper/theme";

test("theme-owned assets stay under their source theme and resolve from stable public URLs", async () => {
  const root = path.resolve(import.meta.dirname, "..", "src", "themes");
  await Promise.all([
    access(path.join(root, "argon", "assets", "background", "campfire.webm")),
    access(path.join(root, "argon", "assets", "background", "campfire.webp")),
    access(path.join(root, "argon", "assets", "auth", "night-camp.webp")),
    access(path.join(root, "argon", "assets", "preview.svg")),
    access(path.join(root, "paper", "assets", "preview.svg")),
  ]);
  for (const group of ["dinosaur", "flower"]) {
    assert.ok(
      (await readdir(path.join(root, "argon", "assets", "stickers", group)))
        .length > 0,
    );
  }
  assert.equal(argon.preview, "/themes/argon/preview.svg");
  assert.equal(paper.preview, "/themes/paper/preview.svg");
  assert.equal(
    argonAssetUrl("/reference/campfire-background.webm"),
    argonAssets.backgroundVideo,
  );
  assert.equal(
    argonAssetUrl("/reference/everunfold-night-camp.webp"),
    argonAssets.managementScene,
  );
  assert.equal(argonAssetUrl("/media/custom.webp"), "/media/custom.webp");
  const sources = JSON.parse(
    await readFile(path.join(root, "argon", "assets", "sources.json"), "utf8"),
  ) as { assets: { file: string; sha256?: string }[] };
  for (const asset of sources.assets.filter((item) => item.sha256)) {
    const contents = await readFile(
      path.join(root, "argon", "assets", asset.file),
    );
    assert.equal(
      createHash("sha256").update(contents).digest("hex"),
      asset.sha256,
      `${asset.file} changed while moving into the theme`,
    );
  }
});
