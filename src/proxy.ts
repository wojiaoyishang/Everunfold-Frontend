import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { hasPublicRoute } from "@/core/content/routes";
import { failureDocument } from "@/themes/argon/failure/document";
import { isManagementRoute } from "@/core/auth/routes";
export async function proxy(request: NextRequest) {
  if (isManagementRoute(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  try {
    const snapshot = await readPublicSnapshot();
    if (!hasPublicRoute(snapshot, request.nextUrl.pathname)) {
      return new NextResponse(failureDocument(404), {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.next();
  } catch {
    return new NextResponse(failureDocument(503), {
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
