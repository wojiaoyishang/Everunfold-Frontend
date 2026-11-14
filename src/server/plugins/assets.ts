import { readPluginAsset } from "./current";
import { validAssetName } from "@/core/plugins/runtime/manifest";
export async function servePluginAsset(
  params: Promise<{ directory: string; filename: string }>,
  surface?: "admin",
) {
  const { directory, filename } = await params;
  if (
    !/^[a-z][a-z0-9-]*$/.test(directory) ||
    !validAssetName(filename) ||
    filename.endsWith(".cjs")
  )
    return new Response(null, { status: 404 });
  const value = await readPluginAsset(directory, filename, surface);
  if (!value) return new Response(null, { status: 404 });
  const mime =
    (
      {
        mjs: "text/javascript; charset=utf-8",
        css: "text/css; charset=utf-8",
        svg: "image/svg+xml",
        woff2: "font/woff2",
        woff: "font/woff",
        ttf: "font/ttf",
        otf: "font/otf",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
        webm: "video/webm",
        mp4: "video/mp4",
      } as Record<string, string>
    )[filename.split(".").at(-1)!] ?? "application/octet-stream";
  return new Response(Buffer.from(value), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": surface
        ? "private, no-store"
        : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
