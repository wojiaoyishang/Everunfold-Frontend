import assert from "node:assert/strict";
import test from "node:test";
import { renderContent } from "../src/core/rendering/content";
import {
  renderNativeShortcodes,
  shortcodeExcerpt,
} from "../src/core/rendering/native-shortcodes";
import { parseShortcodes, shortcodeCall } from "../src/core/shortcodes/parser";
import {
  builtinShortcodes as frontendShortcodes,
  previewShortcodeDefinitions,
} from "../src/core/shortcodes/registry";
import { content } from "./fixtures";
import { backendShortcodes } from "../tools/fixtures/backend-shortcodes";
const builtinShortcodes = () => [...backendShortcodes, ...frontendShortcodes()];

const render = (source: string, type: "markdown" | "html" = "markdown") =>
  renderContent(
    content({ content: [{ id: "native", type, content: source }] }),
    backendShortcodes,
  );
test("preview overrides a name with a temporary identity and retains other custom containers", () => {
  const notice = builtinShortcodes().find((item) => item.name === "notice")!;
  const accordion = builtinShortcodes().find(
    (item) => item.name === "accordion",
  )!;
  const saved = {
    ...notice,
    id: "11111111-1111-1111-1111-111111111111",
    name: "custom:tip",
  };
  const preview = {
    ...saved,
    id: "22222222-2222-2222-2222-222222222222",
    html: saved.html.replace("<strong>", "<strong>Draft "),
  };
  const other = { ...accordion, name: "custom:other" };
  const result = renderContent(
    content({
      content: [
        {
          id: "preview",
          type: "markdown",
          content:
            '{{< custom:tip title="Title" >}}\n{{< custom:other >}}\n**Nested**\n{{< /custom:other >}}\n{{< /custom:tip >}}',
        },
      ],
    }),
    previewShortcodeDefinitions(preview, [saved, other]),
  );
  assert.deepEqual(result.diagnostics, []);
  assert.match(result.html, /<strong>Draft Title<\/strong>/);
  assert.match(result.html, /<details/);
  assert.match(result.html, /<strong>Nested<\/strong>/);
});
test("native containers nest and render Markdown once, without reprocessing generated HTML", () => {
  const result = render(
    [
      '{{< notice type="warning" title="留意" >}}',
      "",
      "**强调**",
      "",
      '{{< accordion title="更多" >}}',
      "",
      "- 第一项",
      "- 第二项",
      "",
      "```js",
      'const x = "{{< notice >}}";',
      "```",
      "",
      "{{< /accordion >}}",
      "",
      "{{< /notice >}}",
    ].join("\n"),
  );
  assert.equal(result.diagnostics.length, 0);
  assert.match(result.html, /data-variant="warning"/);
  assert.match(result.html, /<strong>强调<\/strong>/);
  assert.match(result.html, /<details/);
  assert.match(result.html, /<li>第一项<\/li>/);
  assert.match(result.html, /data-shortcodes/);
  assert.doesNotMatch(result.html, /ef-shortcode-hole|legacy-/);
});

test("legacy square brackets are ordinary content and receive no compatibility styles or reference anchors", () => {
  const result = render(
    '[collapse title="旧内容"][alert]text[/alert][/collapse] [ref]note[/ref]',
  );
  assert.match(result.html, /\[collapse/);
  assert.match(result.html, /\[ref\]note\[\/ref\]/);
  assert.doesNotMatch(
    result.html,
    /<details|data-shortcodes|legacy-|reader-reference/,
  );
  assert.equal(shortcodeExcerpt("[alert]旧文[/alert]"), "[alert]旧文[/alert]");
});

test("protected code, comments, attribute strings and escaped native calls stay literal", () => {
  for (const source of [
    "```html\n{{< notice >}}example{{< /notice >}}\n```",
    "```html\n{{< notice >}}example{{< /notice >}}",
    "    {{< notice >}}example{{< /notice >}}",
    "> ```html\n> {{< notice >}}example{{< /notice >}}\n> ```",
    "`{{< notice >}}example{{< /notice >}}`",
    "<pre>{{< notice >}}example{{< /notice >}}</pre>",
    "<code>{{< notice >}}example{{< /notice >}}</code>",
    '<a title="{{< notice >}}example{{< /notice >}}">link</a>',
    "<!-- {{< notice >}}example{{< /notice >}} -->",
    "\\{{< notice >}}example\\{{< /notice >}}",
  ]) {
    assert.deepEqual(
      parseShortcodes(source, builtinShortcodes(), true).nodes,
      [],
      source,
    );
    assert.equal(
      renderNativeShortcodes(source, true, backendShortcodes, (text) => text)
        .html,
      source,
    );
  }
});

test("unclosed, unknown, duplicate and invalid parameter calls retain source with diagnostics", () => {
  for (const source of [
    "{{< notice >}}unclosed {{< accordion >}}nested{{< /accordion >}}",
    "{{< missing >}}text{{< /missing >}}",
    '{{< notice type="warning" type="error" >}}body{{< /notice >}}',
    "{{< notice type=warning >}}body{{< /notice >}}",
    '{{< notice type="invalid" >}}body{{< /notice >}}',
  ]) {
    const result = renderNativeShortcodes(source, true, [], (text) => text);
    assert.equal(result.html, source);
    assert.ok(result.diagnostics.length, source);
    assert.equal(result.css, "");
  }
});

test("quoted delimiters and HTML parameters cannot inject markup or replace body slots", () => {
  const source = shortcodeCall(
    builtinShortcodes().find((item) => item.name === "notice")!,
    { title: 'a >}} " <img src=x onerror=bad> {{content}}', type: "info" },
    "<b>正文</b><script>bad-code</script>",
  );
  const result = render(source, "html");
  assert.equal(result.diagnostics.length, 0);
  assert.match(result.html, /&lt;img/);
  assert.match(result.html, /{{content}}/);
  assert.match(result.html, /<b>正文<\/b>/);
  assert.doesNotMatch(result.html, /<script|bad-code|<img src="x"/);
  const accessible = render(
    '<section role="note" aria-label="label" title="context" lang="zh-CN" dir="ltr"><time datetime="2026-11-05">date</time></section>',
    "html",
  );
  assert.match(
    accessible.html,
    /role="note" aria-label="label" title="context" lang="zh-CN" dir="ltr"/,
  );
  assert.match(accessible.html, /datetime="2026-11-05"/);
});

test("leaf calls have no closing marker and gallery resolves only provided media IDs", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const source = `{{< gallery id="${id}" columns="2" >}}`;
  const parsed = parseShortcodes(source, builtinShortcodes(), true);
  assert.equal(parsed.nodes.length, 1);
  const result = renderContent(
    content({
      content: [{ id: "gallery", type: "markdown", content: source }],
      media_urls: { [id]: { original: "https://example.test/photo.jpg" } },
    }),
  );
  assert.equal(result.diagnostics.length, 0);
  assert.match(result.html, /class="ef-gallery ef-gallery-2"/);
  assert.match(result.html, /src="https:\/\/example.test\/photo.jpg"/);
});

test("backend templates are runtime data and disappear when their applied catalog is removed", () => {
  const template = {
    ...backendShortcodes[0],
    id: "eaaa1111-1111-4111-8111-111111111111",
    name: "new-plugin:card",
    html: '<section class="dynamic-card"><strong>{{title}}</strong>{{content}}</section>',
  };
  const article = content({
    content: [
      {
        id: "dynamic",
        type: "markdown",
        content:
          '{{< new-plugin:card title="Dynamic definition" >}}\n**Runtime body**\n{{< /new-plugin:card >}}',
      },
    ],
  });
  const active = renderContent(article, [template]);
  assert.deepEqual(active.diagnostics, []);
  assert.match(active.html, /Dynamic definition/);
  assert.match(active.html, /<strong>Runtime body<\/strong>/);
  const disabled = renderContent(article, []);
  assert.ok(disabled.diagnostics.length);
  assert.doesNotMatch(disabled.html, /class="dynamic-card"/);
  assert.match(disabled.html, /new-plugin:card/);
});

test("an applied backend definition keeps template ownership when a frontend name collides", () => {
  const gallery = frontendShortcodes().find((item) => item.name === "gallery")!;
  const definition = {
    ...gallery,
    html: "<p>Backend-owned template</p>",
    parameters: [],
  };
  const result = renderContent(
    content({
      content: [{ id: "owner", type: "markdown", content: "{{< gallery >}}" }],
    }),
    [definition],
  );
  assert.deepEqual(result.diagnostics, []);
  assert.match(result.html, /Backend-owned template/);
  assert.doesNotMatch(result.html, /class="ef-gallery/);
});

test("catalog preview preserves a frontend plugin's sample renderer", () => {
  const gallery = frontendShortcodes().find((item) => item.name === "gallery")!;
  for (const [attributes, columns] of [
    ["", 3],
    [' columns="2"', 2],
    [' columns="4"', 4],
  ] as const) {
    const result = renderContent(
      content({
        content: [
          {
            id: "preview",
            type: "markdown",
            content: `{{< gallery${attributes} >}}`,
          },
        ],
      }),
      previewShortcodeDefinitions(gallery, backendShortcodes),
      { shortcodePreview: true },
    );
    assert.deepEqual(result.diagnostics, []);
    const classes =
      columns === 3
        ? "ef-gallery ef-gallery-sample"
        : `ef-gallery ef-gallery-sample ef-gallery-${columns}`;
    assert.ok(result.html.includes(`class="${classes}"`));
    assert.equal([...result.html.matchAll(/<span><\/span>/g)].length, columns);
  }
});

test("protected shortcode drafts and published markers never render their bodies", () => {
  const reply = render("{{< reply-only >}}private draft{{< /reply-only >}}");
  assert.match(reply.html, /回复可见区域/);
  assert.doesNotMatch(reply.html, /private draft|data-shortcode-region=/);
  const id = "4560da38-6c2c-48b7-a739-4b09f3652ea5";
  const protectedContent = render(
    `{{< password-area region="${id}" >}}{{< /password-area >}}`,
  );
  assert.match(protectedContent.html, /密码保护区域/);
  assert.ok(protectedContent.html.includes(`data-shortcode-region="${id}"`));
});

test("shortcode scripts are carried in inert JSON and get a distinct marker for each instance", () => {
  const notice = builtinShortcodes().find((item) => item.name === "notice")!;
  const javascript = 'root.dataset.example = "</script>";';
  const blocks = {
    content: [
      {
        id: "a",
        type: "markdown" as const,
        content: "{{< notice >}}one{{< /notice >}}",
      },
      {
        id: "b",
        type: "markdown" as const,
        content: "{{< notice >}}two{{< /notice >}}",
      },
    ],
  };
  const rendered = renderContent(content(blocks), [{ ...notice, javascript }]);
  const markers = [
    ...rendered.html.matchAll(/data-shortcode-instance="([^"]+)"/g),
  ].map((item) => item[1]);
  assert.equal(new Set(markers).size, 2);
  const bank = rendered.html.match(
    /<script type="application\/json" data-shortcode-scripts>([^<]+)<\/script>/,
  );
  assert.ok(bank);
  assert.equal(JSON.parse(bank[1])[markers[0]].javascript, javascript);
  assert.doesNotMatch(
    renderContent(content(blocks), [{ ...notice, javascript }], {
      disableShortcodeScripts: true,
    }).html,
    /data-shortcode-scripts/,
  );
});
