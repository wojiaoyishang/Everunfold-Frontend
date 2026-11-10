/** Actual production HTTP checks in the disposable build; no user cache/config/server is touched. */
import { verifyRuntimePlugins } from "./verify-plugin-runtime.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Parser, parseDocument, DomUtils } from "htmlparser2";
import {
  verifyExtensionFixture,
  verifyThemeSwitch,
} from "./fixtures/extensions.mjs";

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
        "--import",
        "tsx",
        "tools/plugins/run.mts",
        "start",
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
    const themes = JSON.parse(
      await readFile(
        path.join(workspace, "var/cache/build/theme-catalog.json"),
        "utf8",
      ),
    );
    for (const theme of themes) {
      if (!theme.preview?.startsWith("/") || theme.preview.startsWith("//"))
        continue;
      const image = await fetch(new URL(theme.preview, base));
      assert.equal(image.status, 200, `Missing theme artwork: ${theme.id}`);
      assert.match(
        image.headers.get("content-type") ?? "",
        /^image\//,
        `Theme artwork resolved as a page: ${theme.id}`,
      );
    }
    console.log(
      "Theme artwork is available in production without a public snapshot or backend.",
    );
    for (const route of [
      "/login",
      "/account",
      "/admin/users",
      "/admin/users/new",
      "/admin/users/presets",
      "/admin/users/00000000-0000-0000-0000-000000000001",
      "/admin/settings/api-keys",
      "/admin",
      "/admin/content",
      "/admin/glossary",
      "/admin/taxonomies",
      "/admin/content/article",
      "/admin/content/shuoshuo",
      "/admin/content/article/new",
      "/admin/content/shuoshuo/new",
      "/admin/content/article/00000000-0000-0000-0000-000000000001/edit",
      "/admin/content/shuoshuo/00000000-0000-0000-0000-000000000001/edit",
      "/admin/content/article/00000000-0000-0000-0000-000000000001/preview",
      "/admin/content/shuoshuo/00000000-0000-0000-0000-000000000001/preview",
      "/admin/content/article/00000000-0000-0000-0000-000000000001/versions",
      "/admin/content/shuoshuo/00000000-0000-0000-0000-000000000001/versions",
      "/admin/pages",
      "/admin/pages/new",
      "/admin/pages/00000000-0000-0000-0000-000000000001",
      "/admin/pages/00000000-0000-0000-0000-000000000001/preview",
      "/admin/pages/00000000-0000-0000-0000-000000000001/live",
      "/admin/content/article/00000000-0000-0000-0000-000000000001/live",
      "/admin/content/shuoshuo/00000000-0000-0000-0000-000000000001/live",
      "/admin/media",
      "/admin/comments",
      "/admin/icons",
      "/admin/fonts",
      "/admin/shortcodes",
      "/admin/settings",
      "/admin/settings/theme",
      "/admin/settings/plugins",
      "/admin/settings/captcha",
      "/admin/settings/system",
      "/admin/settings/runtime",
      "/admin/settings/mail",
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
        classes.has(
          route === "/login"
            ? "management-root"
            : route === "/account"
              ? "account-root"
              : "admin-access",
        ),
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
        [
          "--import",
          "tsx",
          "--import",
          "./tools/extensions/node.mjs",
          "tools/fixtures/settings-snapshot.mts",
          workspace,
        ],
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
    try {
      await verifyExtensionFixture(base);
      await verifyRuntimePlugins({ base, workspace, projectRoot });
      await verifyThemeSwitch(base, configFile);
    } catch (error) {
      throw new Error("Extension runtime failed: " + logs, { cause: error });
    }
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
    const customPage = await fetch(base + "/custom-page");
    assert.equal(customPage.status, 200);
    const customHTML = await customPage.text();
    assert.match(customHTML, /自定义页面样例/);
    assert.match(
      customHTML,
      /sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"/,
    );
    assert.doesNotMatch(customHTML, /allow-same-origin/);
    const peoplePage = await fetch(base + "/people-page");
    assert.equal(peoplePage.status, 200);
    assert.match(await peoplePage.text(), /Fixture Person/);
    const honorsPage = await fetch(base + "/honors-page");
    assert.equal(honorsPage.status, 200);
    assert.match(await honorsPage.text(), /Fixture Honor/);
    assert.equal((await fetch(base + "/unavailable-page")).status, 503);
    console.log(
      "Managed pages: isolated source 200, registered people/honors 200, unavailable implementation 503.",
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
      "/content-features/language-flags-1/flags.woff2",
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
          "--import",
          "./tools/extensions/node.mjs",
          "tools/fixtures/settings-snapshot.mts",
          workspace,
          "languages",
        ],
        { cwd: projectRoot, stdio: "inherit", windowsHide: true },
      );
      fixture.once("error", reject);
      fixture.once("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("Language fixture failed")),
      );
    });
    const landing = await fetch(base + "/", { redirect: "manual" });
    assert.equal(landing.status, 307);
    assert.equal(
      new URL(landing.headers.get("location"), base).pathname.replace(
        /\/$/,
        "",
      ),
      "/zh",
    );
    const chinese = await fetch(base + "/hello.html", {
      headers: {
        Cookie: "everunfold-locale=en",
        "x-everunfold-locale": "en",
        "x-everunfold-ui-locale": "en",
      },
    });
    assert.equal(chinese.status, 200);
    assert.match(await chinese.text(), /<html[^>]*lang="zh-CN"/);
    assert.equal(
      (await fetch(base + "/people-page")).status,
      200,
      "explicit page paths survive a default language prefix",
    );
    const english = await fetch(base + "/custom-english.html");
    assert.equal(english.status, 200);
    assert.equal(english.headers.get("content-language"), "en");
    const englishHTML = await english.text();
    assert.match(englishHTML, /<html[^>]*lang="en"/);
    assert.match(englishHTML, /English fixture body/);
    assert.doesNotMatch(englishHTML, /href="\/francais\/custom-english.html"/);
    const englishHome = await (await fetch(base + "/en/")).text();
    assert.match(englishHome, /href="\/custom-english-page"/);
    assert.doesNotMatch(englishHome, /href="\/stale-page-path"/);
    const authoredEnglish = await fetch(base + "/custom-english-page");
    assert.equal(authoredEnglish.status, 200);
    assert.equal(authoredEnglish.headers.get("content-language"), "en");
    const authoredHTML = await authoredEnglish.text();
    assert.match(authoredHTML, /href="\/custom-french-page"/);
    assert.match(authoredHTML, /English authored page body/);
    const registeredEnglish = await fetch(base + "/en/people-page");
    assert.equal(registeredEnglish.status, 200);
    assert.equal(registeredEnglish.headers.get("content-language"), "en");
    assert.match(await registeredEnglish.text(), /Fixture Person/);
    const titleNodes = DomUtils.findAll(
      (node) =>
        node.type === "tag" &&
        node.attribs.class?.split(/\s+/).includes("post-title"),
      parseDocument(englishHome).children,
    );
    const titles = titleNodes.map((node) => DomUtils.textContent(node));
    assert.ok(titles.includes("English fixture story"));
    assert.ok(!titles.includes("一篇文章"));
    const french = await fetch(base + "/francais/search?q=English");
    assert.equal(french.status, 200);
    assert.equal(french.headers.get("content-language"), "fr");
    const frenchHTML = await french.text();
    assert.match(frenchHTML, /<html[^>]*lang="fr"/);
    assert.match(frenchHTML, /data-ui-locale="en"/);
    assert.equal((await fetch(base + "/francais/missing.html")).status, 404);
    console.log(
      "Configurable language routes passed: Chinese prefix, default landing, custom English URL, French interface fallback, grouped feeds and URL precedence over cookies/headers.",
    );
    await new Promise((resolve, reject) => {
      const fixture = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "--import",
          "./tools/extensions/node.mjs",
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
    assert.equal((await fetch(base + "/custom-page")).status, 404);
    assert.equal((await fetch(base + "/people-page")).status, 404);
    assert.equal((await fetch(base + "/en/people-page")).status, 404);
    assert.equal((await fetch(base + "/custom-english-page")).status, 404);
    console.log(
      "Managed public releases passed: offline reading 200, withdrawal 404 without restarting Next.js.",
    );
    await writeFile(
      path.join(
        workspace,
        "var/settings-verification/admin-verification/00000000-0000-0000-0000-000000000001/public-settings.4.json",
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
