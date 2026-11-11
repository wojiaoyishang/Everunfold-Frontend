import { sitemapResponse } from "@/core/seo/sitemap-response";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return sitemapResponse(request);
}
