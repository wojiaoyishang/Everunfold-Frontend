/** Synthetic offline fixture only; never reads or edits the user's real cache. */
import { mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { snapshot } from "../../tests/fixtures";
import { FileSettingsStore } from "../../src/server/settings/store";
import { FileContentStore } from "../../src/server/content/store";
import { builtinShortcodes } from "../../src/core/shortcodes/registry";
const root = await realpath(process.argv[2]);
const relative = path.relative(await realpath(tmpdir()), root);
if (
  relative.startsWith("..") ||
  path.isAbsolute(relative) ||
  !path.basename(root).startsWith("everunfold-build-")
)
  throw new Error("Expected an isolated verification workspace");
const epoch = "00000000-0000-0000-0000-000000000001";
const value = snapshot();
value.contents[1].content = [
  {
    id: "markdown-features",
    type: "markdown",
    content: "行内 $a^2$。\n\n```python\nprint(42)\n```",
  },
  {
    id: "html-features",
    type: "html",
    content:
      '<div data-math="block" data-latex="E=mc^2">E=mc^2</div><pre><code class="language-javascript">const answer = 42;</code></pre>',
  },
  {
    id: "native-shortcode",
    type: "markdown",
    content:
      '{{< custom:offline title="离线原生模板" >}}\n\n**离线短代码正文**\n\n{{< /custom:offline >}}',
  },
];
value.source_epoch = epoch;
const cache = path.join(root, "var/absent-admin-verification-cache");
await mkdir(cache, { recursive: true });
await writeFile(path.join(cache, "current.json"), JSON.stringify(value));
const contentStore = new FileContentStore(cache, "admin-verification", epoch);
const withdrawing = process.argv[3] === "withdraw";
value.generation = withdrawing ? 3 : 2;
if (withdrawing) {
  value.contents = [];
  value.comments = {};
}
await contentStore.apply({
  protocol: "content-1",
  node_id: "admin-verification",
  source_epoch: epoch,
  resource: "public-content",
  revision: value.generation,
  value,
});
const store = new FileSettingsStore(
  path.join(root, "var/settings-verification"),
  "admin-verification",
  epoch,
);
await store.apply({
  protocol: "settings-1",
  node_id: "admin-verification",
  source_epoch: epoch,
  resource: "public-settings",
  revision: 2,
  value: {
    site: {
      name: "本地设置",
      description: "离线说明",
      author: "测试作者",
      notice_title: "离线公告标题",
      notice: "离线公告正文，来自已经应用的本地设置。",
      navigation: [
        {
          id: "archive",
          label: "同步导航",
          href: "/archives",
          icon: "archive",
          children: [],
        },
      ],
      title_template: "%s — %site%",
      allow_indexing: false,
    },
    theme: {
      hero_title: "离线主题标题",
      hero_subtitle: "离线主题副标题",
      background_play: false,
      background_video_url: "",
      accent: "#397566",
    },
    shortcodes: (() => {
      const source = builtinShortcodes.find((item) => item.name === "notice")!;
      const scope = "ef-sc-00000000000000000000000000000002";
      return [
        {
          ...source,
          id: "00000000-0000-0000-0000-000000000002",
          name: "custom:offline",
          scope,
          html: source.html.replaceAll(source.scope, scope),
          css: source.css.replaceAll(source.scope, scope),
        },
      ];
    })(),
  },
});
await store.apply({
  protocol: "settings-1",
  node_id: "admin-verification",
  source_epoch: epoch,
  resource: "cache-policy",
  revision: 3,
  value: {
    dynamic_freshness_seconds: 17,
    request_timeout_seconds: 3,
    retry_delay_ms: 400,
    batch_delay_ms: 50,
  },
});
