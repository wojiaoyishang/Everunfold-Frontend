import { readRuntimeCatalog } from "@/server/plugins/current";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const catalog = await readRuntimeCatalog();
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    return Response.json(catalog, { headers });
  } catch {
    return Response.json(
      { error: "runtime_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
