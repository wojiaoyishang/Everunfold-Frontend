import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { PublicManagedPage } from "../src/generated/pages-contract";
import {
  pageDocument,
  pageResizeScript,
  pageResizeHash,
} from "../src/core/pages/document";
import {
  pageManifest,
  hasPageImplementation,
} from "../src/core/pages/registry";
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

test("frontend page declarations are reproducibly exported and implementation versions are explicit", async () => {
  assert.deepEqual(
    JSON.parse(
      await readFile(
        new URL("../registrations/pages-v1.json", import.meta.url),
        "utf8",
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
