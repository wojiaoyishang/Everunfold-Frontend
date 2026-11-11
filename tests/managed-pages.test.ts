import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import test from "node:test";
import type { PublicManagedPage } from "@/core/contracts/pages";
import {
  pageDocument,
  pageResizeScript,
  pageResizeHash,
  pageRenderId,
} from "../src/core/pages/document";
import {
  pageManifest,
  hasPageImplementation,
} from "../src/core/pages/registry";
import { pageImageViewerSettings } from "../src/core/pages/image-viewer";
import { checkedPreviewPage } from "../src/core/pages/preview-validation";
import {
  managedPagePreviewPath,
  isManagedPagePreviewPath,
} from "../src/core/pages/preview";
import {
  livePreviewPath,
  isLivePreviewPath,
  previewEditorPath,
} from "../src/core/preview/routes";
import { isManagementRoute, loginReturnPath } from "../src/core/auth/routes";
import { parsePublicSnapshot } from "../src/core/content/validation";
import { snapshot } from "./fixtures";
const id = "00000000-0000-4000-8000-000000000001";
const page: PublicManagedPage = {
  id,
  source: "custom",
  title: "测试页面",
  path: "/people",
  enabled: true,
  revision: 1,
};

test("page documents isolate source and enforce script opt-in, including injected closing tags", () => {
  const js = 'document.body.dataset.executed="yes"';
  const html = pageDocument({
    html: "<h2>页面</h2><script>" + js + "</script>",
    css: "body{color:red}</style><script>injected()</script>",
    javascript: js,
  });
  assert.match(html, /script-src 'sha256-/);
  assert.match(html, /script-src-attr 'none'/);
  assert.match(html, /connect-src 'none'; frame-src 'none'/);
  assert.ok(html.includes("<\\/style><script>injected()"));
  assert.equal(
    pageResizeHash,
    "sha256-" + createHash("sha256").update(pageResizeScript).digest("base64"),
  );
  const enabled = pageDocument({
    html: "",
    javascript_enabled: true,
    javascript: 'const a="</script>";' + js,
  });
  assert.match(enabled, /script-src 'unsafe-inline'/);
  assert.ok(enabled.includes("<\\/script>"));
  assert.equal((enabled.match(/<script>/g) || []).length, 2);
});

test("page script placement preserves legacy ordering, script opt-in and preview identity", () => {
  const value = {
    html: '<p id="content">Body content</p>',
    javascript: 'document.documentElement.dataset.stage="authored-script";',
    javascript_enabled: true,
  };
  const legacy = pageDocument(value);
  for (const position of ["head", "body_end"] as const) {
    const source = { ...value, javascript_position: position };
    const document = pageDocument(source);
    const scriptAt = document.indexOf(value.javascript);
    const bodyAt = document.indexOf("<body>");
    const contentAt = document.indexOf(value.html);
    assert.ok(scriptAt > document.indexOf("Content-Security-Policy"));
    if (position === "head") {
      assert.ok(scriptAt < document.indexOf("</head>"));
      assert.ok(scriptAt < bodyAt);
      assert.notEqual(
        pageRenderId("frame", value),
        pageRenderId("frame", source),
      );
    } else {
      assert.ok(scriptAt > contentAt && scriptAt < document.indexOf("</body>"));
      assert.equal(document, legacy);
      assert.equal(pageRenderId("frame", value), pageRenderId("frame", source));
    }
    const disabled = pageDocument({ ...source, javascript_enabled: false });
    assert.ok(!disabled.includes(value.javascript));
    assert.match(disabled, /script-src 'sha256-/);
    assert.match(disabled, /everunfold:page:ready/);
  }
});

test("managed page image viewer is declared in the iframe and page render identity", () => {
  const value = {
    html: '<img src="site://media/example">',
    show_image_viewer: true,
  };
  const enabled = pageDocument(value);
  assert.match(enabled, /data-image-viewer="true"/);
  assert.match(enabled, /everunfold:page:image/);
  const disabled = pageDocument({ ...value, show_image_viewer: false });
  assert.match(disabled, /data-image-viewer="false"/);
  assert.notEqual(
    pageRenderId("frame", value),
    pageRenderId("frame", { ...value, show_image_viewer: false }),
  );
});

test("code page declarations and page settings control the shared image viewer", () => {
  assert.deepEqual(pageImageViewerSettings({}), {
    enabled: true,
    selector: "[data-managed-page-body] img[src]",
  });
  assert.equal(pageImageViewerSettings({}, { enabled: false }).enabled, false);
  assert.equal(
    pageImageViewerSettings({ show_image_viewer: false }).enabled,
    false,
  );
  assert.equal(
    pageImageViewerSettings({}, { selector: ".gallery" }).selector,
    "[data-managed-page-body] .gallery img[src]",
  );
});

test("frontend page declarations are reproducibly exported and implementation versions are explicit", async () => {
  assert.deepEqual(
    JSON.parse(
      execFileSync(
        process.execPath,
        ["--import", "tsx", "tools/export-page-manifest.mts"],
        { encoding: "utf8" },
      ),
    ),
    pageManifest,
  );
  assert.equal(
    hasPageImplementation({
      ...page,
      source: "registered",
      implementation_id: "core.people",
      implementation_version: "1.0.0",
    }),
    true,
  );
  assert.equal(
    hasPageImplementation({
      ...page,
      source: "registered",
      implementation_id: "core.people",
      implementation_version: "2.0.0",
    }),
    false,
  );
  assert.equal(
    hasPageImplementation({
      ...page,
      source: "registered",
      implementation_id: "remote.url",
      implementation_version: "1.0.0",
    }),
    false,
  );
});

test("private preview routes cover pages, articles and shuoshuo with safe login returns", () => {
  for (const kind of ["page", "article", "shuoshuo"] as const) {
    const path = livePreviewPath(kind, id);
    assert.ok(isLivePreviewPath(path));
    assert.ok(isManagementRoute(path));
    assert.equal(loginReturnPath(path), path);
    assert.ok(isManagementRoute(previewEditorPath(kind, id)));
  }
  assert.ok(isManagedPagePreviewPath(managedPagePreviewPath(id)));
  for (const path of [
    "/admin/pages/new/live",
    "/admin/content/page/" + id + "/live",
    "/admin/pages/" + id + "/live/unknown",
  ])
    assert.equal(isLivePreviewPath(path), false);
  assert.throws(() => livePreviewPath("page", "../../capture"));
});

test("live page payloads reject wrong identities and invalid schemas; public snapshots reject path collisions", () => {
  assert.ok(checkedPreviewPage(page, id));
  assert.equal(checkedPreviewPage({ ...page, id: "wrong" }, id), null);
  assert.equal(checkedPreviewPage({ ...page, enabled: false }, id), null);
  assert.equal(checkedPreviewPage({ ...page, revision: 0 }, id), null);
  const data = { ...snapshot(), pages: [page] };
  assert.equal(parsePublicSnapshot(data).pages?.length, 1);
  for (const path of [
    "/admin/users",
    "/hello.html",
    "//outside.example",
    "/bad?query",
    "/people/",
  ])
    assert.throws(() =>
      parsePublicSnapshot({ ...data, pages: [{ ...page, path }] }),
    );
  assert.throws(() =>
    parsePublicSnapshot({
      ...data,
      pages: [page, { ...page, id: "00000000-0000-4000-8000-000000000002" }],
    }),
  );
});
