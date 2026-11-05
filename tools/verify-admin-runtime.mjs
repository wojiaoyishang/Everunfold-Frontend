/** Actual production HTTP checks in the disposable build; no user cache/config/server is touched. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Parser, parseDocument, DomUtils } from "htmlparser2";

export async function verifyAdminRuntime({ workspace, projectRoot }) {
  let backendRequests = 0;
  const offlineBackend = createHttpServer((_request, response) => {
    backendRequests++;
    response.writeHead(503, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        success: false,
        code: 503,
        msg: "unavailable",
        data: null,
      }),
    );
  });
  offlineBackend.listen(0, "127.0.0.1");
  await once(offlineBackend, "listening");
  let child;
  try {
    const probe = createServer();
    probe.listen(0, "127.0.0.1");
    await once(probe, "listening");
    const port = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));
    const configFile = path.join(workspace, "admin-verification.toml");
    await writeFile(
      configFile,
      `BACKEND_BASE_URL = "http://127.0.0.1:${offlineBackend.address().port}"
FRONTEND_NODE_ID = "admin-verification"
[backend]
connect_timeout_seconds = 1
request_timeout_seconds = 1
[settings]
directory = "./var/settings-verification"
source_epoch = "00000000-0000-0000-0000-000000000001"
[cache]
directory = "./var/absent-admin-verification-cache"
`,
    );
    child = spawn(
      process.execPath,
      [
        path.join(workspace, "node_modules/next/dist/bin/next"),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        cwd: workspace,
        env: {
          ...process.env,
          CONFIG_FILE: configFile,
          EVERUNFOLD_PROJECT_ROOT: workspace,
          BACKEND_BASE_URL: `http://127.0.0.1:${offlineBackend.address().port}`,
          NEXT_TELEMETRY_DISABLED: "1",
        },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let logs = "";
    const capture = (chunk) => {
      logs = (logs + chunk.toString()).slice(-4000);
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    let launchError;
    child.on("error", (error) => {
      launchError = error;
    });
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (launchError || child.exitCode !== null)
        throw launchError ?? new Error(logs);
      try {
        if (
          (await fetch(`${base}/login`, { signal: AbortSignal.timeout(1000) }))
            .ok
        ) {
          ready = true;
          break;
        }
      } catch {
        /* Bounded startup wait only. */
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, `Isolated admin server did not become ready: ${logs}`);
    for (const route of [
      "/login",
      "/admin",
      "/admin/content",
      "/admin/content/article",
      "/admin/content/shuoshuo",
      "/admin/content/article/new",
      "/admin/content/shuoshuo/new",
      "/admin/content/article/00000000-0000-0000-0000-000000000001/edit",
      "/admin/content/shuoshuo/00000000-0000-0000-0000-000000000001/edit",
      "/admin/content/article/00000000-0000-0000-0000-000000000001/preview",
      "/admin/content/shuoshuo/00000000-0000-0000-0000-000000000001/preview",
      "/admin/pages",
      "/admin/media",
      "/admin/icons",
      "/admin/fonts",
      "/admin/shortcodes",
      "/admin/settings",
      "/admin/settings/theme",
      "/admin/settings/system",
    ]) {
      const response = await fetch(base + route, {
        signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get("cache-control") ?? "", /private/);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
      const html = await response.text();
      const classes = new Set();
      new Parser({
        onopentag(_name, attributes) {
          for (const value of (attributes.class ?? "").split(/\s+/))
            classes.add(value);
        },
      }).end(html);
      assert.equal(
        classes.has("blog-shell"),
        false,
        `${route} must not mount the public shell`,
      );
      assert.equal(
        classes.has("admin-account"),
        false,
        `${route} must not embed an authenticated account in SSR`,
      );
      assert.ok(
        classes.has(route === "/login" ? "management-root" : "admin-access"),
      );
      console.log(
        `${route}: production 200, private/no-store, noindex, anonymous shell`,
      );
    }
    assert.equal(
      backendRequests,
      0,
      "Private shells must not request public snapshots or check browser identity in shared SSR",
    );
    console.log(
      "Admin route isolation passed with an unavailable backend and no public cache.",
    );
    assert.equal(
      (await fetch(base + "/")).status,
      503,
      "cold public cache must fail honestly",
    );
    await new Promise((resolve, reject) => {
      const fixture = spawn(
        process.execPath,
        ["--import", "tsx", "tools/fixtures/settings-snapshot.mts", workspace],
        { cwd: projectRoot, stdio: "inherit", windowsHide: true },
      );
      fixture.once("error", reject);
      fixture.once("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("Settings fixture failed")),
      );
    });
    const home = await fetch(base + "/");
    assert.equal(home.status, 200);
    const body = await home.text();
    assert.ok(body.includes("离线主题标题") && body.includes("同步导航"));
    assert.ok(body.includes("离线公告标题") && body.includes("离线公告正文"));
    const article = await fetch(base + "/hello.html");
    assert.equal(article.status, 200);
    const html = await article.text();
    assert.doesNotMatch(html, /data-shortcodes/);
    assert.match(html, /<title>一篇文章 — 本地设置<\/title>/);
    assert.match(html, /name="robots" content="noindex, follow"/);
    const resources = (markup) => {
      const result = [];
      new Parser({
        onopentag(tag, attributes) {
          if (tag === "link" && attributes["data-content-resource"])
            result.push(attributes.href);
        },
      }).end(markup);
      return result;
    };
    assert.deepEqual(
      resources(html),
      [],
      "plain articles must not declare code/math assets",
    );
    const richArticle = await fetch(base + "/second.html");
    assert.equal(richArticle.status, 200);
    const richHtml = await richArticle.text();
    const richDocument = parseDocument(richHtml);
    assert.match(DomUtils.textContent(richDocument), /离线原生模板/);
    assert.ok(
      DomUtils.findAll(
        (node) =>
          node.name === "strong" &&
          DomUtils.textContent(node) === "离线短代码正文",
        richDocument.children,
      ).length,
    );
    assert.match(richHtml, /data-shortcodes/);
    assert.doesNotMatch(richHtml, /{{&lt; custom:offline|ef-shortcode-hole/);
    assert.match(richHtml, /data-typeset="true"/);
    assert.match(richHtml, /<math .*MathML/);
    assert.match(richHtml, /hljs-keyword/);
    assert.match(richHtml, /hljs-built_in/);
    assert.match(richHtml, /data-code-frame/);
    assert.match(richHtml, /class="code-line/);
    assert.match(richHtml, /data-code-source=/);
    assert.equal(resources(richHtml).length, 3);
    for (const asset of [
      ...resources(richHtml),
      "/content-features/katex-0.19.1/fonts/KaTeX_Main-Regular.woff2",
    ]) {
      const response = await fetch(base + asset);
      assert.equal(response.status, 200, asset);
      assert.match(response.headers.get("content-type") ?? "", /css|font|woff/);
    }
    console.log(
      "Content features passed: mixed Markdown/HTML SSR math/highlight, conditional local CSS/fonts, no assets for plain articles.",
    );
    assert.equal(
      backendRequests,
      0,
      "public reading must not reach the offline backend",
    );
    await new Promise((resolve, reject) => {
      const fixture = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "tools/fixtures/settings-snapshot.mts",
          workspace,
          "withdraw",
        ],
        { cwd: projectRoot, stdio: "inherit", windowsHide: true },
      );
      fixture.once("error", reject);
      fixture.once("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("Withdrawal fixture failed")),
      );
    });
    assert.equal(
      (await fetch(base + "/hello.html")).status,
      404,
      "withdrawn content must not reappear from the retained legacy snapshot",
    );
    console.log(
      "Managed public releases passed: offline reading 200, withdrawal 404 without restarting Next.js.",
    );
    await writeFile(
      path.join(
        workspace,
        "var/settings-verification/admin-verification/00000000-0000-0000-0000-000000000001/public-settings.3.json",
      ),
      "corrupt",
    );
    assert.equal(
      (await fetch(base + "/")).status,
      503,
      "corrupt latest settings must not fall back to an older revision",
    );
    assert.equal(
      (await fetch(base + "/admin/settings")).status,
      200,
      "configuration failure must not block the repair interface",
    );
    console.log(
      "Offline settings passed: cold 503; local snapshot + applied settings 200 with SEO; corrupt latest 503; admin remains accessible.",
    );
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, "exit");
      child.kill();
      await stopped;
    }
    offlineBackend.closeAllConnections();
    await new Promise((resolve) => offlineBackend.close(resolve));
  }
}
