import { readPublicSnapshot } from "@/core/content/snapshot";
export async function GET() {
  try {
    await readPublicSnapshot();
    return Response.json(
      {
        success: true,
        code: 200,
        msg: "公开内容可读取",
        data: { public_read: true, cache_receiver: false },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        success: false,
        code: 503,
        msg: "公开内容暂不可用",
        data: { public_read: false, cache_receiver: false },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
