import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { hasPublicRoute } from "@/core/content/routes";
import { resolveContent } from "@/core/content/query";
import { failureDocument } from "@/themes/argon/failure/document";
import { isManagementRoute } from "@/core/auth/routes";
import {
  localeOf,
  localePath,
  localizeHref,
  unprefixedPath,
} from "@/core/i18n/locale";
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const headers = new Headers(request.headers);
  headers.set("x-everunfold-path", path);
  headers.set("x-everunfold-management", "false");
  if (isManagementRoute(request.nextUrl.pathname)) {
    headers.set(
      "x-everunfold-locale",
      localeOf(request.cookies.get("everunfold-admin-locale")?.value),
    );
    headers.set("x-everunfold-management", "true");
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  try {
    const snapshot = await readPublicSnapshot();
    const content = resolveContent(snapshot, path);
    const locale = content ? localeOf(content.language) : localePath(path);
    headers.set("x-everunfold-locale", locale);
    const base = unprefixedPath(path);
    const rewrite =
      !content && locale === "en" && localizeHref(base, "en") !== base;
    if (!hasPublicRoute(snapshot, rewrite ? base : path)) {
      return new NextResponse(failureDocument(404), {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    const target = request.nextUrl.clone();
    if (rewrite) target.pathname = base;
    const response = rewrite
      ? NextResponse.rewrite(target, { request: { headers } })
      : NextResponse.next({ request: { headers } });
    response.headers.set("Content-Language", locale);
    return response;
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
    "/((?!_next/|reference/|content-features/|media/|uploads/|health/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
