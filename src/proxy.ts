import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { hasPublicRoute } from "@/core/content/routes";
import { resolveManagedPage } from "@/core/pages/resolve";
import { resolveContent } from "@/core/content/query";
import { failureDocument } from "@/themes/argon/failure/document";
import { isManagementRoute } from "@/core/auth/routes";
import {
  localeOf,
  localePath,
  localizeHref,
  messageLocale,
} from "@/core/i18n/locale";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { localizedCodePath } from "@/core/i18n/routes";
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
    headers.set(
      "x-everunfold-ui-locale",
      messageLocale(
        request.cookies.get("everunfold-admin-ui")?.value ??
          request.cookies.get("everunfold-admin-locale")?.value,
      ),
    );
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  try {
    const snapshot = await readPublicSnapshot();
    const catalog = normalizeCatalog(
      snapshot.site.settings?.site.language_catalog,
    );
    const content = resolveContent(snapshot, path);
    const managed = resolveManagedPage(snapshot, path);
    const locale = content
      ? localeOf(content.language)
      : localePath(path, catalog);
    headers.set("x-everunfold-locale", locale);
    headers.set(
      "x-everunfold-ui-locale",
      catalog.languages.find((item) => item.code === locale)?.ui_locale ??
        catalog.languages.find((item) => item.code === catalog.default_code)!
          .ui_locale,
    );
    const codePath = localizedCodePath(snapshot, path);
    const active = catalog.languages.some(
      (item) => item.code === locale && item.enabled,
    );
    const defaultLanguage = catalog.languages.find(
      (item) => item.code === catalog.default_code,
    )!;
    if (
      !content &&
      !managed &&
      !codePath &&
      defaultLanguage.prefix &&
      hasPublicRoute(snapshot, path)
    ) {
      const canonical = request.nextUrl.clone();
      canonical.pathname = localizeHref(path, catalog.default_code, catalog);
      const redirect = NextResponse.redirect(canonical, 307);
      redirect.headers.set("Cache-Control", "no-store");
      return redirect;
    }
    if (
      (!content && !managed && !active) ||
      !hasPublicRoute(snapshot, codePath ?? path)
    ) {
      return new NextResponse(failureDocument(404), {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    const response = NextResponse.next({ request: { headers } });
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
