/** Isolated 3/4/50-language UI fixtures; never reads or edits a real instance. */
import { realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { content, snapshot } from "../../tests/fixtures";
import { customLanguage } from "../../src/core/i18n/choices";
import { FileContentStore } from "../../src/server/content/store";
import { FileSettingsStore } from "../../src/server/settings/store";
import type { Content } from "../../src/core/content/types";

const root = await realpath(process.argv[2]);
const relative = path.relative(await realpath(tmpdir()), root);
if (
  relative.startsWith("..") ||
  path.isAbsolute(relative) ||
  !path.basename(root).startsWith("everunfold-build-")
)
  throw new Error("Expected an isolated verification workspace");
const codes = [
  "zh-CN",
  "en",
  "fr-CA",
  "de",
  "ja",
  "ko",
  "es",
  "it",
  "pt",
  "ru",
  "ar",
  "nl",
  "pl",
  "sv",
  "fi",
  "da",
  "nb",
  "el",
  "cs",
  "uk",
  "he",
  "hi",
  "th",
  "vi",
  "id",
  "ms",
  "fil",
  "tr",
  "fa",
  "bn",
  "ta",
  "ur",
  "sw",
  "ro",
  "hu",
  "sk",
  "sl",
  "hr",
  "bg",
  "sr",
  "lt",
  "lv",
  "et",
  "is",
  "ga",
  "ca",
  "eu",
  "gl",
  "mt",
  "eo",
];
const languages = codes.map((code) =>
  customLanguage(
    code,
    code === "zh-CN"
      ? "简体中文"
      : code === "eo"
        ? "Esperanto — nom de langue personnalisé très long pour le test"
        : (new Intl.DisplayNames([code], { type: "language" }).of(code) ??
          code),
  ),
);
const epoch = "00000000-0000-0000-0000-000000000001";
const value = snapshot();
value.source_epoch = epoch;
value.schema_version = "0.6.0";
value.contents = [];
for (const [index, kind, count] of [
  [1, "article", 50],
  [2, "article", 3],
  [3, "article", 4],
  [4, "shuoshuo", 50],
] as const) {
  const group = languages.slice(0, count);
  const prefix = `${kind}-${count}`;
  const members = group.map((language, position) => ({
    id: `${prefix}-${language.code}`,
    language: language.code,
    path: `/${prefix}/${language.code.toLowerCase()}.html`,
    access: "public" as const,
    is_original: position === 0,
  }));
  for (const member of members)
    value.contents.push(
      content({
        id: member.id,
        path: member.path,
        language: member.language,
        kind,
        title: `多语言显示测试 · ${count} 种语言`,
        translation_group_id: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
        translations: members,
        cover_url:
          kind === "article" ? "/reference/everunfold-night-camp.webp" : null,
        content: [
          {
            id: `${member.id}-body`,
            type: "markdown",
            content:
              "## 临时界面模拟\n\nThis isolated fixture contains no user data.",
          },
        ],
      } satisfies Partial<Content>),
    );
}
await new FileContentStore(
  path.join(root, "var/many-language-content"),
  "language-preview",
  epoch,
).apply({
  protocol: "content-1",
  node_id: "language-preview",
  source_epoch: epoch,
  resource: "public-content",
  revision: 1,
  value,
});
const settings = new FileSettingsStore(
  path.join(root, "var/many-language-settings"),
  "language-preview",
  epoch,
);
await settings.apply({
  protocol: "settings-1",
  node_id: "language-preview",
  source_epoch: epoch,
  resource: "public-settings",
  revision: 1,
  value: {
    site: {
      name: "Everunfold",
      description: "Isolated synthetic language preview",
      author: "测试作者",
      language_catalog: { default_code: "zh-CN", languages },
    },
    theme: { background_video_url: "", background_play: false },
  },
});
await settings.apply({
  protocol: "settings-1",
  node_id: "language-preview",
  source_epoch: epoch,
  resource: "cache-policy",
  revision: 1,
  value: {
    dynamic_freshness_seconds: 30,
    request_timeout_seconds: 3,
    retry_delay_ms: 400,
    batch_delay_ms: 50,
  },
});
await writeFile(
  path.join(root, "language-preview.toml"),
  `BACKEND_BASE_URL = "http://127.0.0.1:65534"
FRONTEND_NODE_ID = "language-preview"
[backend]
connect_timeout_seconds = 1
request_timeout_seconds = 1
[settings]
directory = "./var/many-language-settings"
source_epoch = "${epoch}"
[cache]
directory = "./var/many-language-content"
`,
);
console.log("Created isolated 3/4/50-language article and shuoshuo fixtures");
