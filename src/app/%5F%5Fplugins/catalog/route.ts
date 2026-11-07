import { readRuntimeCatalog } from "@/server/plugins/current";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const catalog = await readRuntimeCatalog();
    const headers = {
      "Cache-Control": "no-store",
      ETag: `"${catalog.revision}"`,
      "X-Content-Type-Options": "nosniff",
    };
    if (request.headers.get("if-none-match") === headers.ETag)
      return new Response(null, { status: 304, headers });
    return Response.json(catalog, { headers });
  } catch {
    return Response.json(
      { error: "runtime_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
