import { readPluginAsset } from "@/server/plugins/current";
import { validAssetName } from "@/core/plugins/runtime/manifest";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ directory: string; filename: string }> },
) {
  const { directory, filename } = await params;
  if (
    !/^[a-z][a-z0-9-]*$/.test(directory) ||
    !validAssetName(filename) ||
    filename.endsWith(".cjs")
  )
    return new Response(null, { status: 404 });
  const value = await readPluginAsset(directory, filename);
  if (!value) return new Response(null, { status: 404 });
  const mime = filename.endsWith(".mjs")
    ? "text/javascript; charset=utf-8"
    : filename.endsWith(".css")
      ? "text/css; charset=utf-8"
      : filename.endsWith(".svg")
        ? "image/svg+xml"
        : filename.endsWith(".woff2")
          ? "font/woff2"
          : "application/octet-stream";
  return new Response(Buffer.from(value), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
