import { servePluginAsset } from "@/server/plugins/assets";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ directory: string; filename: string }> },
) {
  return servePluginAsset(params, "admin");
}
