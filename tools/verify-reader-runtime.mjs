/** Real isolated Next/FastAPI processes; never removes or mutates the user's public cache. */
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import { cp, mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { parse } from "smol-toml";
import { Parser } from "htmlparser2";

function visibleText(html) {
  let result = "";
  let hidden = 0;
  const parser = new Parser({
    onopentag(name) {
      if (name === "script" || name === "style") hidden++;
    },
    onclosetag(name) {
      if (name === "script" || name === "style") hidden--;
    },
    ontext(text) {
      if (!hidden) result += text;
    },
  });
  parser.end(html);
  return result;
}

function classCount(html, name) {
  let count = 0;
  const parser = new Parser({
    onopentag(_tag, attributes) {
      if (attributes.class?.split(/\s+/).includes(name)) count++;
    },
  });
  parser.end(html);
  return count;
}

export async function verifyReaderRuntime({
  workspace,
  projectRoot,
  interactive = false,
}) {
  const backendRoot =
    process.env.READER_BACKEND_ROOT ??
    path.resolve(projectRoot, "../../Python/Everunfold-Backend");
  const api = "http://127.0.0.1:8991";
  const warm = "http://127.0.0.1:3991";
  const cold = "http://127.0.0.1:3992";
  const children = new Set();
  let backend;
  let backendDelay = 0;
  const config = parse(
    await readFile(path.join(projectRoot, "config.toml"), "utf8"),
  );
  const originalCache = path.resolve(
    projectRoot,
    config.cache?.directory ?? "var/public-snapshots",
  );
  async function readSourceSnapshot() {
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        "--import",
        "tsx",
        "--import",
        "./tools/extensions/node.mjs",
        "tools/fixtures/content-snapshot.mts",
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          NODE_ENV: "test",
          CONFIG_FILE: path.join(projectRoot, "config.toml"),
        },
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    const managed = JSON.parse(stdout);
    return managed
      ? Buffer.from(JSON.stringify(managed))
      : await readFile(path.join(originalCache, "current.json"));
  }
  const original = await readSourceSnapshot();
  const snapshot = JSON.parse(original.toString("utf8"));
  const content =
    snapshot.contents.find(
      (item) =>
        item.kind === "article" &&
        (snapshot.comments[item.id]?.length ?? 0) > 0,
    ) ?? snapshot.contents.find((item) => item.kind === "article");
  assert.ok(content, "Need an existing public article for the offline check");
  for (const port of [8991, 3991, 3992]) {
    const { createServer } = await import("node:net");
    const probe = createServer();
    probe.listen(port, "127.0.0.1");
    await once(probe, "listening");
    await new Promise((resolve) => probe.close(resolve));
  }
  function start(command, args, cwd, env = {}) {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", () => {});
    child.stderr.on("data", () => {});
    child.on("error", (error) => console.error(error.message));
    children.add(child);
    return child;
  }
  async function stop(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
  async function waitFor(url, expected = 200) {
    for (let attempt = 0; attempt < 120; attempt++) {
      try {
        if (
          (await fetch(url, { signal: AbortSignal.timeout(1000) })).status ===
          expected
        )
          return;
      } catch {
        /* Startup only. */
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Preview did not become ready: ${url}`);
  }
  async function online(delay = 0) {
    if (backend && backend.exitCode === null && backend.signalCode === null)
      if (backendDelay === delay) return;
      else await stop(backend);
    backendDelay = delay;
    backend = start(
      path.join(
        backendRoot,
        process.platform === "win32"
          ? ".venv/Scripts/python.exe"
          : ".venv/bin/python",
      ),
      [
        "-c",
        [
          "import uvicorn",
          "import asyncio",
          "from app.core.config import load_settings, ReaderPreviewConfig, CORSConfig",
          "from app.entrypoints.api import create_app",
          `settings = load_settings().model_copy(update={'reader_preview': ReaderPreviewConfig(enabled=True), 'cors': CORSConfig(allowed_origins=['${warm}', '${cold}'])})`,
          "app = create_app(settings)",
          "@app.middleware('http')",
          "async def preview_delay(request, call_next):",
          `    if request.url.path.startswith(('/v1/reader-preview/', '/v1/comments')): await asyncio.sleep(${delay})`,
          "    return await call_next(request)",
          "uvicorn.run(app, host='127.0.0.1', port=8991, log_level='warning', access_log=False)",
        ].join("\n"),
      ],
      backendRoot,
      { CONFIG_FILE: path.join(backendRoot, "config.toml") },
    );
    await waitFor(`${api}/health/live`);
  }
  async function htmlAt(origin, route, expected) {
    const response = await fetch(new URL(route, origin));
    assert.equal(response.status, expected, `${origin}${route}`);
    const html = await response.text();
    assert.doesNotMatch(
      html,
      /postgresql\+asyncpg:|allowed_peer_ips|FASTAPI_TO_NEXTJS|NEXTJS_TO_FASTAPI/,
    );
    if (expected === 200) {
      assert.equal(
        classCount(html, "blog-shell"),
        1,
        "Public layout must be mounted exactly once",
      );
      assert.match(html, /data-page-ready="true"/);
      assert.match(html, /backend-status/);
      assert.match(html, /data-ready="false"/);
      if (route === content.path) {
        assert.equal(
          classCount(html, "article-card"),
          1,
          "Article SSR must include one reading surface",
        );
        assert.ok(
          classCount(html, "article-content") > 0,
          "Article body must be embedded in the initial HTML",
        );
        assert.doesNotMatch(
          html,
          /正在加载组件…|组件暂不可用/,
          "SEO content must not be replaced by extension loading placeholders",
        );
        const han = content.title.match(/\p{Script=Han}/u)?.[0];
        if (han) {
          assert.ok(
            html.includes(han),
            "Unicode article text must stay literal",
          );
          assert.doesNotMatch(
            html,
            new RegExp(`&#x${han.codePointAt(0).toString(16)};`, "i"),
            "Unicode article text must not be inflated into numeric entities",
          );
        }
      }
      assert.ok(
        visibleText(html).includes(content.title) || route === "/?type=article",
      );
    } else {
      assert.match(html, /noindex/);
      assert.match(html, /页面加载失败/);
      assert.match(html, /后端同步失败/);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("retry-after"), "60");
      assert.doesNotMatch(html, /data-page-ready="true"/);
    }
    return html;
  }
  try {
    for (const name of ["media", "uploads"]) {
      const source = path.join(projectRoot, "public", name);
      try {
        await access(source);
      } catch {
        continue;
      }
      await cp(source, path.join(workspace, "public", name), {
        recursive: true,
      });
    }
    for (const [name, origin] of [
      ["warm", warm],
      ["cold", cold],
    ]) {
      const directory = path.join(workspace, `reader-cache-${name}`);
      await mkdir(directory);
      if (name === "warm")
        await writeFile(path.join(directory, "current.json"), original);
      const filename = path.join(workspace, `reader-${name}.toml`);
      await writeFile(
        filename,
        `BACKEND_BASE_URL = "${api}"\nFRONTEND_NODE_ID = "reader-${name}"\nPUBLIC_SITE_URL = "${origin}"\n[cache]\ndirectory = '${directory.replaceAll("\\", "/")}'\n`,
      );
      start(
        process.execPath,
        [
          path.join(workspace, "node_modules/next/dist/bin/next"),
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          new URL(origin).port,
        ],
        workspace,
        {
          CONFIG_FILE: filename,
          EVERUNFOLD_PROJECT_ROOT: workspace,
          BACKEND_BASE_URL: api,
          NEXT_TELEMETRY_DISABLED: "1",
        },
      );
    }
    await online();
    await waitFor(warm);
    await waitFor(cold, 503);
    const metric = await fetch(
      `${api}/v1/reader-preview/metrics?ids=${content.id}`,
      { headers: { Origin: warm } },
    );
    assert.equal(metric.status, 200);
    assert.equal(metric.headers.get("access-control-allow-origin"), warm);
    assert.equal((await metric.json()).data.mode, "demo");
    const before = await htmlAt(warm, content.path, 200);
    await stop(backend);
    await assert.rejects(fetch(`${api}/v1/reader-preview/identity`));
    const cached = await htmlAt(warm, content.path, 200);
    assert.ok(visibleText(cached).includes(content.title));
    for (const comment of snapshot.comments[content.id] ?? [])
      assert.ok(visibleText(cached).includes(comment.author));
    assert.equal(
      /<title>(.*?)<\/title>/.exec(before)?.[1],
      /<title>(.*?)<\/title>/.exec(cached)?.[1],
    );
    await htmlAt(warm, "/?type=article", 200);
    await htmlAt(cold, content.path, 503);
    await htmlAt(cold, "/", 503);
    for (const route of ["/login", "/admin"]) {
      const response = await fetch(`${cold}${route}`);
      assert.equal(
        response.status,
        200,
        `Management entry ${route} must not depend on a public snapshot or API availability`,
      );
      assert.match(response.headers.get("cache-control") ?? "", /private/);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
      const html = await response.text();
      assert.equal(classCount(html, "blog-shell"), 0);
      if (route === "/admin") {
        assert.equal(classCount(html, "admin-access"), 1);
        assert.equal(classCount(html, "admin-access-card"), 1);
        assert.equal(classCount(html, "admin-account"), 0);
        continue;
      }
      assert.equal(classCount(html, "management-root"), 1);
      assert.equal(
        classCount(html, "login-card"),
        1,
        "Authentication gates must use the shared compact entry card",
      );
      assert.equal(
        classCount(html, "management-scene"),
        1,
        "Authentication gates must render their static night backdrop",
      );
      assert.match(
        html,
        /\/reference\/everunfold-night-camp\.webp/,
        "Authentication gates must use the supplied night-camp background",
      );
      assert.equal(
        classCount(html, "admin-workspace"),
        0,
        "An unverified identity must never expose the workspace in SSR",
      );
      assert.doesNotMatch(
        html,
        /csrf_token|password_hash|session_hash|postgresql\+asyncpg:|FASTAPI_TO_NEXTJS|NEXTJS_TO_FASTAPI/,
      );
      assert.match(visibleText(html), /正在确认登录状态/);
    }
    assert.deepEqual(await readSourceSnapshot(), original);
    console.log(
      "PASS: real backend stopped; warm snapshot article/home/comments/SEO stay readable (200) with exactly one blog shell, empty snapshot article/home return 503 no-store/noindex; login/admin remain 200 private no-store/noindex with no public shell or private SSR data; original cache unchanged.",
    );
    if (interactive) {
      await online();
      console.log(
        JSON.stringify({
          warm: new URL(content.path, warm).href,
          cold: new URL(content.path, cold).href,
          api,
          commands: "offline / online / slow (4s) / quit",
        }),
      );
      const input = createInterface({ input: process.stdin });
      for await (const line of input) {
        if (line.trim() === "quit") {
          input.close();
          break;
        }
        if (line.trim() === "offline") {
          await stop(backend);
          console.log(
            "Backend stopped; cached/empty frontend instances stay available.",
          );
        }
        if (line.trim() === "online") {
          await online();
          console.log("Backend available again.");
        }
        if (line.trim() === "slow") {
          await online(4);
          console.log(
            "Reader and comment requests now take 4 seconds in the test backend only.",
          );
        }
      }
    }
  } finally {
    for (const child of children) await stop(child);
  }
}
