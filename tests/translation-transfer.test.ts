import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { TranslationOverrideItem } from "../src/core/contracts/settings";
import {
  draftIdentity,
  parseTranslationBundle,
  serializeTranslationBundle,
} from "../src/core/settings/translation-transfer";

function item(
  scope: "public" | "admin" | "backend",
  key: string,
  value: string,
  locale = "zh-CN",
): TranslationOverrideItem {
  return {
    id: randomUUID(),
    scope,
    key,
    owner: "frontend",
    locale,
    source: key,
    source_hash: "hash",
    value,
    revision: 1,
    updated_at: "2026-11-11T00:00:00Z",
  };
}

test("translation export includes saved values and pending draft changes", () => {
  const source = serializeTranslationBundle(
    [
      item("public", "工作台", "大香蕉"),
      item("admin", "工作台", "控制台"),
      item("backend", "core.error", "处理失败", "en"),
    ],
    {
      [draftIdentity("public", "zh-CN", "工作台")]: "首页",
      [draftIdentity("admin", "zh-CN", "工作台")]: "",
    },
    "2026-11-11T01:02:03.000Z",
  );

  const parsed = parseTranslationBundle(source);
  assert.equal(parsed.exportedAt, "2026-11-11T01:02:03.000Z");
  assert.deepEqual(parsed.entries, [
    { scope: "public", locale: "zh-CN", key: "工作台", value: "首页" },
    { scope: "backend", locale: "en", key: "core.error", value: "处理失败" },
  ]);
});

test("translation import accepts empty values and rejects unsupported files", () => {
  const parsed = parseTranslationBundle(
    JSON.stringify({
      format: "everunfold-translations",
      version: 1,
      exported_at: "2026-11-11T00:00:00Z",
      overrides: { admin: { "zh-CN": { 工作台: "" } } },
    }),
  );
  assert.deepEqual(parsed.entries, [
    { scope: "admin", locale: "zh-CN", key: "工作台", value: "" },
  ]);

  for (const source of [
    "not json",
    JSON.stringify({
      format: "other",
      version: 1,
      exported_at: "",
      overrides: {},
    }),
    JSON.stringify({
      format: "everunfold-translations",
      version: 1,
      exported_at: "",
      overrides: { unknown: {} },
    }),
    JSON.stringify({
      format: "everunfold-translations",
      version: 1,
      exported_at: "",
      overrides: { public: { zh_CN: { key: "值" } } },
    }),
  ])
    assert.throws(() => parseTranslationBundle(source));
});
