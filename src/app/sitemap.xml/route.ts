import { SITEMAP_PREVIEW_PATH } from "@/core/seo/sitemap-paths";
import { sitemapXmlResponse } from "@/core/seo/sitemap-response";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  if (new URL(request.url).searchParams.get("format") === "html")
    return new Response(null, {
      status: 308,
      headers: { Location: SITEMAP_PREVIEW_PATH, "Cache-Control": "no-store" },
    });
  return sitemapXmlResponse();
}
