import { sitemapPreviewResponse } from "@/core/seo/sitemap-response";

export const dynamic = "force-dynamic";

export function GET() {
  return sitemapPreviewResponse();
}
