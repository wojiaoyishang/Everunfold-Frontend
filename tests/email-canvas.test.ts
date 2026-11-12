import assert from "node:assert/strict";
import test from "node:test";
import {
  editEmailCanvas,
  renderEmailCanvas,
} from "../src/core/notifications/email-canvas";

test("email canvas displays the help link and preserves variables when visually edited", () => {
  const source = [
    '<table role="presentation"><tr><td style="color:{{site.accent_color}}">',
    "<p>Hello {{site.name}} &amp; guests</p>",
    '<img data-mail-optional="site.icon_url" src="{{site.icon_url}}">',
    '<a title="has href= in its title" data-mail-optional="site.support_url" href="{{site.support_url}}">Help</a>',
    "</td></tr></table>",
  ].join("\n");
  const values = {
    "site.name": "<My Blog>",
    "site.accent_color": "#345678",
    "site.support_url": "https://example.com/help?lang=en&theme=dark",
  };
  const original = renderEmailCanvas(source, values);
  assert.match(original.document, /Hello &lt;My Blog&gt; &amp; guests/);
  assert.match(
    original.document,
    /href="https:\/\/example\.com\/help\?lang=en&amp;theme=dark"/,
  );
  assert.doesNotMatch(original.document, /<img\s/);
  const text = [...original.targets.values()].find(
    (item) => item.kind === "text",
  );
  assert.ok(text);
  const revised = editEmailCanvas(source, text, "Welcome {{site.name}}", "");
  assert.equal(
    revised,
    source.replace("Hello {{site.name}} &amp; guests", "Welcome {{site.name}}"),
  );
  const link = [...renderEmailCanvas(revised, values).targets.values()].find(
    (item) => item.kind === "link",
  );
  assert.ok(link);
  const changed = editEmailCanvas(
    revised,
    link,
    "Get help",
    "https://example.com/contact",
  );
  assert.match(
    changed,
    /title="has href= in its title" href="https:\/\/example\.com\/contact">Get help<\/a>/,
  );
  assert.doesNotMatch(changed, /data-mail-optional="site\.support_url"/);
});

test("email canvas strips executable content from both frames", () => {
  const { document } = renderEmailCanvas(
    '<form><input></form><script>alert(1)</script><p onclick="alert(1)">{{actor.name}}</p><a href="javascript:alert(1)">Help</a>',
    { "actor.name": "<img src=x>" },
  );
  assert.doesNotMatch(document, /<(form|script)|onclick|javascript:/);
  assert.match(document, /&lt;img src=x&gt;/);
});
