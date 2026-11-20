import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { writeArtifact } from "./write-artifact.mjs";

export async function readPinnedContract({
  backendRoot,
  relativeSource,
  pin,
  output,
}) {
  function verify(content) {
    const source = content?.replaceAll("\r\n", "\n");
    if (
      source &&
      createHash("sha256").update(source).digest("hex") === pin.sha256
    )
      return source;
    return null;
  }

  async function readVerified(file) {
    return verify(await readFile(file, "utf8").catch(() => null));
  }

  const name = path.basename(relativeSource);
  const cacheDir = process.env.EVERUNFOLD_CONTRACT_CACHE;
  const cacheFile = cacheDir && path.join(cacheDir, pin.sha256, name);
  let checkoutSource;
  try {
    checkoutSource = execFileSync(
      "git",
      ["show", `${pin.source_commit}:${relativeSource}`],
      {
        cwd: backendRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
  } catch {
    // A shallow checkout or a copied source tree may only have the working file.
  }
  const local =
    verify(checkoutSource) ??
    (await readVerified(path.join(backendRoot, relativeSource))) ??
    (await readVerified(path.join(output, name)));
  if (local) {
    if (cacheFile) await writeArtifact(cacheFile, local);
    return local;
  }
  if (cacheFile) {
    const cached = await readVerified(cacheFile);
    if (cached) return cached;
  }

  const errors = [];
  const customBase = process.env.EVERUNFOLD_CONTRACT_BASE_URL?.trim();
  const downloads = [
    [
      customBase ||
        "https://raw.githubusercontent.com/wojiaoyishang/Everunfold-Backend",
      `${pin.source_commit}/${relativeSource}`,
      {},
    ],
    [
      "https://api.github.com/repos/wojiaoyishang/Everunfold-Backend",
      `contents/${relativeSource}?ref=${pin.source_commit}`,
      { Accept: "application/vnd.github.raw+json" },
    ],
  ];
  for (const [base, route, headers] of downloads) {
    try {
      const url = new URL(route, base.replace(/\/+$/, "") + "/");
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error("invalid contract download URL");
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
      }
      const source = verify(await response.text());
      if (!source) throw new Error("SHA256 mismatch");
      if (cacheFile) await writeArtifact(cacheFile, source);
      return source;
    } catch (error) {
      errors.push(error.cause?.code ?? error.message);
    }
  }
  throw new Error(
    `Pinned contract ${name} at ${pin.source_commit} unavailable (${errors.join(", ")}). ` +
      "Provide EVERUNFOLD_BACKEND_PATH with the locked commits or set EVERUNFOLD_CONTRACT_BASE_URL.",
  );
}
