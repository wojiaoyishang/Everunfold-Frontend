import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  flagChoices,
  presetLanguages,
  customLanguage,
  searchText,
} from "../src/core/i18n/choices";
import { defaultFlag } from "../src/core/i18n/catalog";
import { nativeMessageLocale } from "../src/core/i18n/locale";
import { languageSearchText } from "../src/core/i18n/search";

test("the bundled flag font matches the shipped Unicode catalog and pinned asset", () => {
  const root = new URL("../", import.meta.url);
  const data = readFileSync(new URL("src/core/i18n/data/flags.json", root));
  const base = new URL("public/content-features/language-flags-1/", root);
  const manifest = JSON.parse(
    readFileSync(new URL("source.json", base), "utf8"),
  );
  const font = readFileSync(new URL("flags.woff2", base));
  const digest = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest(data), manifest.unicode_data_sha256);
  assert.equal(JSON.parse(data.toString()).length, manifest.flag_count);
  assert.equal(font.toString("ascii", 0, 4), "wOF2");
  assert.equal(font.readUInt32BE(8), font.length);
  assert.equal(font.length, manifest.bytes);
  assert.equal(digest(font), manifest.sha256);
  assert.ok(
    readFileSync(new URL("LICENSE.md", base), "utf8").includes("CC BY 4.0"),
  );
});

test("flag choices contain qualified national, subdivision and general flags with searchable names", () => {
  const choices = flagChoices("zh-CN");
  assert.ok(choices.length >= 270);
  assert.equal(new Set(choices.map((item) => item.emoji)).size, choices.length);
  assert.equal(choices.find((item) => item.code === "JP")?.emoji, "🇯🇵");
  assert.ok(
    choices
      .find((item) => item.code === "JP")
      ?.search.includes(searchText("日本")),
  );
  assert.ok(choices.some((item) => item.name === "England"));
  assert.ok(choices.some((item) => item.name === "rainbow flag"));
  assert.ok(choices.every((item) => Array.from(item.emoji).length <= 16));
});
test("language suggestions are conveniences while custom tags, prefixes and flags remain available", () => {
  const items = presetLanguages("zh-CN");
  assert.equal(items.find((item) => item.code === "ja")?.flag, "🇯🇵");
  assert.equal(items.find((item) => item.code === "fr-CA")?.flag, "🇨🇦");
  assert.deepEqual(customLanguage("eo", "Esperanto", "/esperanto"), {
    code: "eo",
    name: "Esperanto",
    prefix: "/esperanto",
    flag: "🏳️",
    enabled: true,
    ui_locale: "en",
  });
  assert.equal(defaultFlag("en-US"), "🇺🇸");
  assert.equal(defaultFlag("zh-Hans-CN"), "🇨🇳");
  assert.equal(nativeMessageLocale("en"), "en");
  assert.equal(nativeMessageLocale("ja"), undefined);
});

test("language search accepts configured names, regional codes and native or translated names", () => {
  const portuguese = languageSearchText("pt-BR", "巴葡读者", "zh-CN");
  for (const query of [
    "巴葡读者",
    "PT-br",
    "Portuguese",
    "português",
    "葡萄牙",
  ])
    assert.ok(portuguese.includes(searchText(query)), query);
  assert.ok(languageSearchText("ja", "自定名称", "en").includes("日本語"));
  assert.ok(
    languageSearchText(
      "qaa-x-personal",
      "My custom language",
      "zh-CN",
    ).includes("my custom language"),
  );
});
