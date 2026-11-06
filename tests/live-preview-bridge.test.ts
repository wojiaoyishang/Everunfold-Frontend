import assert from "node:assert/strict";
import test from "node:test";
import {
  previewNavigation,
  previewStamp,
  samePreview,
} from "../src/core/preview/bridge";
import { pageDocument, pageRenderId } from "../src/core/pages/document";

const session = "00000000-0000-4000-8000-000000000001";
test("preview receipts bind a valid session and an exact positive safe revision", () => {
  const valid = { preview_session: session, preview_revision: 2 };
  assert.ok(samePreview(previewStamp(valid), previewStamp(valid)));
  for (const revision of [
    0,
    -1,
    1.2,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "2",
    null,
  ])
    assert.equal(previewStamp({ ...valid, preview_revision: revision }), null);
  assert.equal(previewStamp({ ...valid, preview_session: "wrong" }), null);
  assert.equal(
    samePreview(
      previewStamp(valid),
      previewStamp({ ...valid, preview_revision: 1 }),
    ),
    false,
  );
  assert.equal(
    samePreview(
      previewStamp(valid),
      previewStamp({
        ...valid,
        preview_session: "00000000-0000-4000-8000-000000000002",
      }),
    ),
    false,
  );
  assert.equal(samePreview(null, null), false);
});
test("embedded navigation rejects malformed, scripted and credential-bearing destinations", () => {
  for (const target of [
    "http://[",
    "javascript:alert(1)",
    "data:text/html,example",
    "https://user:secret@example.test/",
  ])
    assert.equal(previewNavigation(target, "https://blog.example.test"), null);
  assert.equal(
    previewNavigation("/admin/pages", "https://blog.example.test")?.href,
    "https://blog.example.test/admin/pages",
  );
});
test("source iframe identity is deterministic across SSR and hydration inputs, but changes with source", () => {
  const value = {
    title: "test",
    path: "/test",
    html: "<p>One</p>",
    css: "p{color:inherit}",
  };
  const render = (html: string) =>
    pageRenderId("react-frame-id", { ...value, html });
  assert.equal(render(value.html), render(value.html));
  assert.notEqual(render(value.html), render("<p>Two</p>"));
});
test("source readiness identity is escaped without granting authored scripts execution", () => {
  const html = pageDocument(
    { html: "<p>Example</p>", javascript_enabled: false },
    '\"><script>bad()</script>',
  );
  assert.match(html, /data-everunfold-render="&quot;>&lt;script>/);
  assert.match(html, /script-src 'sha256-/);
  assert.match(html, /everunfold:page:ready/);
});
