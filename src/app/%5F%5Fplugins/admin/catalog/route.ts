import { readRuntimeCatalog } from "@/server/plugins/current";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    return Response.json(await readRuntimeCatalog("admin"), { headers });
  } catch {
    return Response.json(
      { error: "runtime_unavailable" },
      { status: 503, headers },
    );
  }
}
