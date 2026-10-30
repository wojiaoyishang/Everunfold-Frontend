import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { hasPublicRoute } from "@/core/content/routes";
const unavailable = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>内容暂时不可用</title><style>body{margin:0;background:#17152b;color:#f3f0ff;font:16px/1.8 system-ui,sans-serif;display:grid;min-height:100vh;place-items:center}main{padding:32px;max-width:540px}h1{font-size:30px}p{color:#c3bdd8}a{color:#c4a7ff}</style></head><body><main><p>EVERUNFOLD</p><h1>故事正在准备中。</h1><p>公开内容暂时无法读取，请稍后再来。</p><a href="/">重新打开</a></main></body></html>`;
export async function proxy(request: NextRequest) {
  try {
    const snapshot = await readPublicSnapshot();
    if (!hasPublicRoute(snapshot, request.nextUrl.pathname)) {
      return new NextResponse(
        unavailable
          .replace("故事正在准备中。", "这个故事还没有展开。")
          .replace(
            "公开内容暂时无法读取，请稍后再来。",
            "地址可能已经变更，或这篇内容尚未公开。",
          )
          .replaceAll("内容暂时不可用", "页面不存在"),
        {
          status: 404,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }
    return NextResponse.next();
  } catch {
    return new NextResponse(unavailable, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "60",
      },
    });
  }
}
export const config = {
  matcher: [
    "/((?!_next/|reference/|media/|uploads/|health/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
