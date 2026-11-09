import { feedResponse } from "@/core/seo/feed-response";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return feedResponse(request, "atom");
}
